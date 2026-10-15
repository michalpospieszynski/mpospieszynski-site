package pl.mpospieszynski.site.shared.web;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The OpenAPI spec at /api/v3/api-docs generates the Angular client (`npm run api:generate`).
 * Every endpoint declares `@Operation(operationId = ...)`, which becomes the client method name;
 * admin operations get the Supabase bearer-token scheme automatically.
 */
@Configuration
class OpenApiConfig {

    static final String SUPABASE_SCHEME = "supabase";
    static final String ADMIN_PATHS = "/api/v1/admin/";

    @Bean
    OpenAPI siteOpenApi() {
        return new OpenAPI()
                .info(new Info().title("mpospieszynski.pl API").version("v1")
                        .description("Public content in Polish and English (?lang=pl|en) and the owner's admin API."))
                .components(new Components().addSecuritySchemes(SUPABASE_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Supabase access token of the site owner (app_metadata.role = admin).")));
    }

    @Bean
    OpenApiCustomizer adminOperationsNeedTheSupabaseToken() {
        return openApi -> openApi.getPaths().forEach((path, item) -> {
            if (path.startsWith(ADMIN_PATHS)) {
                item.readOperations().forEach(operation ->
                        operation.addSecurityItem(new SecurityRequirement().addList(SUPABASE_SCHEME)));
            }
        });
    }
}
