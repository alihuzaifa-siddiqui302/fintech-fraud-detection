# ==============================================================================
# FraudGuard Backend — Production Multi-Stage Dockerfile
# Builder: Maven 3.9 + JDK 21 | Runtime: JRE 21 Alpine (slim)
# Tuned for 512 MB RAM free-tier hosts (Render, Railway, Fly.io)
# ==============================================================================

# ── Stage 1: Dependency cache layer ──────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS deps
WORKDIR /build

# Cache dependencies separately from source — only re-downloads on pom.xml change
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# ── Stage 2: Compile & package ───────────────────────────────────────────────
FROM deps AS builder
COPY src ./src
RUN mvn package -DskipTests -B -q

# ── Stage 3: Minimal hardened runtime ────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security hardening
RUN addgroup -S fraudguard && adduser -S fraudguard -G fraudguard

COPY --from=builder /build/target/*.jar app.jar
RUN chown fraudguard:fraudguard app.jar

USER fraudguard
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Production JVM flags — tuned for 512 MB RAM free-tier containers
# -Xmx384m     : hard heap ceiling (leaves ~128 MB for OS + Metaspace)
# -Xms128m     : start small, let JVM grow on demand
# -XX:+UseG1GC : low-latency GC suitable for API workloads
# -XX:MaxMetaspaceSize=128m : cap Metaspace to prevent unbounded growth
ENTRYPOINT ["java", \
  "-Xmx384m", \
  "-Xms256m", \
  "-XX:+UseG1GC", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:+UseContainerSupport", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
