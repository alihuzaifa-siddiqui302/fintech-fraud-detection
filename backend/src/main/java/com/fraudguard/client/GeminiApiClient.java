// com.fraudguard.client.GeminiApiClient
package com.fraudguard.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraudguard.exception.SarGenerationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Enterprise client for Google Gemini 2.0 Flash AI API generating FinCEN-compliant SAR narratives.
 */
@Slf4j
@Component
public class GeminiApiClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final double temperature;
    private final int maxOutputTokens;

    public GeminiApiClient(
            ObjectMapper objectMapper,
            @Value("${fraudguard.external.gemini.api-key:}") String apiKey,
            @Value("${fraudguard.external.gemini.base-url:https://generativelanguage.googleapis.com/v1beta/models}") String baseUrl,
            @Value("${fraudguard.external.gemini.model:gemini-2.0-flash}") String model,
            @Value("${fraudguard.external.gemini.timeout-ms:30000}") int timeoutMs,
            @Value("${fraudguard.external.gemini.temperature:0.3}") double temperature,
            @Value("${fraudguard.external.gemini.max-output-tokens:2048}") int maxOutputTokens
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.model = model;
        this.temperature = temperature;
        this.maxOutputTokens = maxOutputTokens;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(timeoutMs > 0 ? timeoutMs : 30000);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public record GeminiRequest(List<GeminiContent> contents, GeminiGenerationConfig generationConfig) {}

    public record GeminiContent(List<GeminiPart> parts) {}

    public record GeminiPart(String text) {}

    public record GeminiGenerationConfig(double temperature, int maxOutputTokens, double topP) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeminiResponse(List<GeminiCandidate> candidates, GeminiUsageMetadata usageMetadata) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeminiCandidate(GeminiContent content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeminiUsageMetadata(Integer promptTokenCount, Integer candidatesTokenCount, Integer totalTokenCount) {}

    public record GeminiGenerationResult(String text, int promptTokens, int outputTokens, long generationMs) {}

    /**
     * Sends prompt to Gemini 2.0 Flash and returns structured generation results including token metrics.
     *
     * @param prompt formatted regulatory context and instructions
     * @return GeminiGenerationResult containing generated narrative and execution metrics
     */
    public GeminiGenerationResult generate(String prompt) {
        if (apiKey.isEmpty()) {
            log.warn("Gemini API key not configured");
            throw new SarGenerationException("Gemini API key not set. Add GEMINI_API_KEY to your environment.");
        }

        String url = String.format("%s/%s:generateContent?key=%s", baseUrl, model, apiKey);

        GeminiRequest requestPayload = new GeminiRequest(
                List.of(new GeminiContent(List.of(new GeminiPart(prompt)))),
                new GeminiGenerationConfig(temperature, maxOutputTokens, 0.8)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestPayload, headers);

        long startTime = System.currentTimeMillis();
        try {
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(url, entity, GeminiResponse.class);
            long generationMs = System.currentTimeMillis() - startTime;

            GeminiResponse body = response.getBody();
            if (body == null || body.candidates() == null || body.candidates().isEmpty()) {
                throw new SarGenerationException("Gemini returned empty response — possible content filtering. Try again.");
            }

            GeminiCandidate candidate = body.candidates().get(0);
            if (candidate.content() == null || candidate.content().parts() == null || candidate.content().parts().isEmpty()) {
                throw new SarGenerationException("Gemini returned empty candidate content — possible content filtering. Try again.");
            }

            String text = candidate.content().parts().get(0).text();
            if (text == null || text.isBlank()) {
                throw new SarGenerationException("Gemini returned blank response text. Try again.");
            }

            int promptTokens = body.usageMetadata() != null && body.usageMetadata().promptTokenCount() != null
                    ? body.usageMetadata().promptTokenCount()
                    : (prompt.length() / 4);
            int outputTokens = body.usageMetadata() != null && body.usageMetadata().candidatesTokenCount() != null
                    ? body.usageMetadata().candidatesTokenCount()
                    : (text.length() / 4);

            return new GeminiGenerationResult(text.trim(), promptTokens, outputTokens, generationMs);

        } catch (HttpClientErrorException e) {
            int code = e.getStatusCode().value();
            if (code == 400) {
                throw new SarGenerationException("Invalid request to Gemini: " + e.getResponseBodyAsString());
            } else if (code == 403) {
                throw new SarGenerationException("Gemini API key invalid or quota exceeded");
            } else if (code == 429) {
                throw new SarGenerationException("Gemini rate limit hit. Wait 60 seconds.");
            } else {
                throw new SarGenerationException("Gemini error (" + code + "): " + e.getMessage());
            }
        } catch (ResourceAccessException e) {
            throw new SarGenerationException("Gemini timed out after 30s. Try again.");
        } catch (RestClientException e) {
            log.error("Gemini call failed with RestClientException", e);
            throw new SarGenerationException("Gemini call failed: " + e.getMessage());
        }
    }
}
