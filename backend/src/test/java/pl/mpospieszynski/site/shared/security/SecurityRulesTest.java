package pl.mpospieszynski.site.shared.security;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

/** B3: anonymous → 401 on admin, non-admin → 403, admin → 200, public reads and the contact form open. */
// Nested test classes are skipped by component scanning, so the test endpoints are imported explicitly.
@WebMvcTest(controllers = SecurityRulesTest.Endpoints.class)
@Import({SecurityConfig.class, SupabaseJwtConverter.class, SecurityRulesTest.Properties.class, SecurityRulesTest.Endpoints.class})
class SecurityRulesTest {

    @Autowired
    MockMvc mvc;

    @Test
    void adminEndpointsNeedAToken() throws Exception {
        mvc.perform(get("/api/v1/admin/ping")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpointsRejectSignedInNonAdmins() throws Exception {
        mvc.perform(get("/api/v1/admin/ping").with(jwt())).andExpect(status().isForbidden());
    }

    @Test
    void adminEndpointsAcceptTheAdmin() throws Exception {
        mvc.perform(get("/api/v1/admin/ping").with(admin())).andExpect(status().isOk());
        mvc.perform(put("/api/v1/admin/ping").with(admin())).andExpect(status().isOk());
    }

    @Test
    void publicReadsAndTheContactFormAreOpen() throws Exception {
        mvc.perform(get("/api/v1/public/ping")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/public/contact")).andExpect(status().isOk());
        mvc.perform(get("/media/a.webp")).andExpect(status().isOk());
    }

    @Test
    void publicPathsDoNotAcceptWrites() throws Exception {
        mvc.perform(post("/api/v1/public/ping")).andExpect(status().isUnauthorized());
    }

    @Test
    void everythingElseIsDenied() throws Exception {
        mvc.perform(get("/api/v1/internal")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/internal").with(admin())).andExpect(status().isForbidden());
    }

    @Test
    void everyResponseCarriesTheSecurityHeaders() throws Exception {
        for (String path : new String[] {"/api/v1/public/ping", "/media/a.webp", "/api/v1/admin/ping"}) {
            mvc.perform(get(path))
                    .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"))
                    .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                    .andExpect(header().string("Permissions-Policy", SecurityConfig.PERMISSIONS_POLICY))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        }
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @TestConfiguration
    @EnableConfigurationProperties(SiteSecurityProperties.class)
    static class Properties {
    }

    @RestController
    static class Endpoints {

        @GetMapping({"/api/v1/admin/ping", "/api/v1/public/ping", "/media/a.webp", "/api/v1/internal"})
        String get() {
            return "ok";
        }

        @PutMapping("/api/v1/admin/ping")
        String put() {
            return "ok";
        }

        @PostMapping({"/api/v1/public/contact", "/api/v1/public/ping"})
        String post() {
            return "ok";
        }
    }
}
