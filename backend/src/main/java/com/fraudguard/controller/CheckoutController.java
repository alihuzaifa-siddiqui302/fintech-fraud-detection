// com.fraudguard.controller.CheckoutController
package com.fraudguard.controller;

import com.fraudguard.dto.request.CheckoutRequest;
import com.fraudguard.dto.response.CheckoutResponse;
import com.fraudguard.service.CheckoutService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoint receiving financial checkout transactions for low-latency risk evaluation.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
public class CheckoutController {

    private final CheckoutService checkoutService;

    /**
     * Submits a customer transaction for synchronous fraud risk evaluation and compliance adjudication.
     *
     * @param request validated checkout payload
     * @param httpRequest HTTP servlet request for IP and network origin discovery
     * @return ResponseEntity containing CheckoutResponse with decision status and risk metrics
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CheckoutResponse> checkout(
            @Valid @RequestBody CheckoutRequest request,
            HttpServletRequest httpRequest
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        log.info("Received checkout request from user: {}, amount: {} {}",
                userEmail, request.getAmount(), request.getCurrency());

        CheckoutResponse response = checkoutService.processCheckout(request, userEmail, httpRequest);
        return ResponseEntity.ok(response);
    }
}
