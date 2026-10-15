package pl.mpospieszynski.site.profile;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import pl.mpospieszynski.site.TestcontainersConfiguration;

/** GET /api/v1/public/profile against the dev sample content (docs/screens/public/01-app-shell.md, Data). */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/dev")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicProfileTests {

    @Autowired
    MockMvc mvc;

    @Test
    void returnsTheEnglishProfileWithItsSiteProjectSlug() throws Exception {
        mvc.perform(get("/api/v1/public/profile?lang=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lang").value("en"))
                .andExpect(jsonPath("$.fullName").value("Michał Pospieszyński"))
                .andExpect(jsonPath("$.headline").value("Calm systems for processes that matter"))
                .andExpect(jsonPath("$.availability.status").value("LIMITED"))
                .andExpect(jsonPath("$.availability.from").value("2026-12-01"))
                .andExpect(jsonPath("$.availability.visible").value(true))
                .andExpect(jsonPath("$.socialLinks.email").value("pospieszynski.michal@gmail.com"))
                .andExpect(jsonPath("$.siteProject.slug").value("how-this-site-is-built"))
                .andExpect(jsonPath("$.siteProject.lang").value("en"))
                .andExpect(jsonPath("$.portrait").doesNotExist());
    }

    @Test
    void defaultsToPolish() throws Exception {
        mvc.perform(get("/api/v1/public/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lang").value("pl"))
                .andExpect(jsonPath("$.headline").value("Spokojne systemy dla ważnych procesów"))
                .andExpect(jsonPath("$.siteProject.slug").value("jak-zbudowana-jest-ta-strona"));
    }

    @Test
    void isPublicAndCacheableWithServerTiming() throws Exception {
        mvc.perform(get("/api/v1/public/profile?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=60")))
                .andExpect(header().string("Cache-Control", containsString("stale-while-revalidate=600")))
                .andExpect(header().string("Server-Timing", containsString("app;dur=")));
    }
}
