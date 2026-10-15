package pl.mpospieszynski.site.shared.web;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.swagger.v3.oas.annotations.Operation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.TestcontainersConfiguration;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** B6: the spec builds at /api/v3/api-docs, keeps the declared operationIds and secures admin operations. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, OpenApiTests.Endpoints.class})
class OpenApiTests {

    @Autowired
    MockMvc mvc;

    @Test
    void publishesTheSpecWithTheSupabaseSecurityScheme() throws Exception {
        mvc.perform(get("/api/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("mpospieszynski.pl API"))
                .andExpect(jsonPath("$.components.securitySchemes.supabase.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.supabase.scheme").value("bearer"));
    }

    @Test
    void securesAdminOperationsOnly() throws Exception {
        mvc.perform(get("/api/v3/api-docs"))
                .andExpect(jsonPath("$.paths['/api/v1/admin/docs-probe'].get.operationId").value("getAdminDocsProbe"))
                .andExpect(jsonPath("$.paths['/api/v1/admin/docs-probe'].get.security[0]", hasKey("supabase")))
                .andExpect(jsonPath("$.paths['/api/v1/public/docs-probe'].get.operationId").value("getPublicDocsProbe"))
                .andExpect(jsonPath("$.paths['/api/v1/public/docs-probe'].get", not(hasKey("security"))))
                .andExpect(jsonPath("$.paths['/api/v1/public/docs-probe'].get.parameters[0].schema.enum[0]").value("pl"));
    }

    @Test
    void leavesMediaAndActuatorOutOfTheSpec() throws Exception {
        mvc.perform(get("/api/v3/api-docs"))
                .andExpect(jsonPath("$.paths", not(hasKey("/media/{key}"))))
                .andExpect(jsonPath("$.paths", not(hasKey("/api/actuator/health"))));
    }

    @RestController
    static class Endpoints {

        @Operation(operationId = "getPublicDocsProbe")
        @GetMapping("/api/v1/public/docs-probe")
        String publicProbe(@RequestParam(defaultValue = "pl") SiteLocale lang) {
            return "ok";
        }

        @Operation(operationId = "getAdminDocsProbe")
        @GetMapping("/api/v1/admin/docs-probe")
        String adminProbe() {
            return "ok";
        }
    }
}
