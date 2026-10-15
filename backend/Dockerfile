# API image (docs/IMPLEMENTATION-PLAN.md, I2): layered Spring Boot jar on a slim JRE, non-root, no secrets.
# Every setting comes from the environment at runtime (infra/docker-compose.yml, infra/.env.example).
#   docker build -t site-api backend
# Tests are not run here: CI runs ./gradlew check before images are built.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
# Wrapper and build scripts first, so the Gradle distribution and dependencies stay cached between code changes.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
# sh gradlew, not ./gradlew: a repository created on Windows may not record the execute bit.
RUN sh gradlew --no-daemon --quiet dependencies > /dev/null
COPY src src
RUN sh gradlew --no-daemon --quiet bootJar \
 && find build/libs -name '*.jar' ! -name '*-plain.jar' -exec cp {} app.jar \; \
 && java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
# Least-changing layers first.
COPY --from=build /src/extracted/dependencies/ ./
COPY --from=build /src/extracted/spring-boot-loader/ ./
COPY --from=build /src/extracted/snapshot-dependencies/ ./
COPY --from=build /src/extracted/application/ ./
USER app
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Djava.awt.headless=true"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/actuator/health/liveness > /dev/null || exit 1
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
