# Stage 1: Build artifact with cached dependencies
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Minimal hardened runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S fraudguard && adduser -S fraudguard -G fraudguard

COPY --from=builder /build/target/*.jar app.jar
RUN chown fraudguard:fraudguard app.jar

USER fraudguard
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
