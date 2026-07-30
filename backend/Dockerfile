# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies separately from source for faster rebuilds
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system envpilot && adduser --system --ingroup envpilot envpilot

COPY --from=build /app/target/env-pilot-*.jar app.jar
RUN chown envpilot:envpilot app.jar
USER envpilot

EXPOSE 9095

# Checks DB connectivity specifically: the aggregate /actuator/health also
# reports mail status, which would mark the container unhealthy on invalid
# SMTP creds even though the app itself is fully up.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
    CMD curl -s http://localhost:9095/actuator/health | grep -q '"db":{"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
