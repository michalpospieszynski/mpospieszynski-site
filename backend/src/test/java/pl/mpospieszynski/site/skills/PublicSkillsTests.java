package pl.mpospieszynski.site.skills;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import pl.mpospieszynski.site.TestcontainersConfiguration;

/**
 * GET /api/v1/public/skills against the dev sample content (docs/screens/public/05-skills.md): three expertise
 * areas, Spring Boot described in Polish only, Kubernetes hidden from the skills page.
 */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/dev")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicSkillsTests {

    @Autowired
    MockMvc mvc;

    @Test
    void listsAreasWithTechnologiesAndPublishedEvidence() throws Exception {
        mvc.perform(get("/api/v1/public/skills?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areas[*].title").value(contains(
                        "Projektowanie API", "Wydajność baz danych", "Migracje bez przestoju")))
                .andExpect(jsonPath("$.areas[0].technologies[*].slug").value(contains("spring-boot", "openapi")))
                .andExpect(jsonPath("$.areas[0].projects[*].slug").value(contains(
                        "system-zamowien", "jak-zbudowana-jest-ta-strona")));
    }

    @Test
    void fallsBackToPolishForUntranslatedEvidenceAndDescriptions() throws Exception {
        mvc.perform(get("/api/v1/public/skills?lang=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.areas[1].title").value("Database performance"))
                .andExpect(jsonPath("$.areas[1].projects[*].slug").value(contains("order-processing-api", "raporty-sprzedazy")))
                .andExpect(jsonPath("$.areas[1].projects[*].lang").value(contains("en", "pl")))
                .andExpect(jsonPath("$.categories[?(@.category == 'BACKEND')].technologies[?(@.slug == 'spring-boot')].descriptionLang")
                        .value(contains("pl")))
                .andExpect(jsonPath("$.categories[?(@.category == 'LANGUAGE')].technologies[?(@.slug == 'java')].description")
                        .value(contains("The main language I write backends in.")));
    }

    @Test
    void groupsVisibleTechnologiesByCategoryWithCounts() throws Exception {
        mvc.perform(get("/api/v1/public/skills?lang=pl"))
                .andExpect(jsonPath("$.categories[*].category").value(contains(
                        "LANGUAGE", "BACKEND", "FRONTEND", "DATA", "INFRASTRUCTURE", "TOOLING")))
                .andExpect(jsonPath("$.categories[0].technologies[0].slug").value("java"))
                .andExpect(jsonPath("$.categories[0].technologies[0].sinceYear").value(2012))
                .andExpect(jsonPath("$.categories[0].technologies[0].projectCount").value(3))
                .andExpect(jsonPath("$.categories[?(@.category == 'FRONTEND')].technologies[?(@.slug == 'rxjs')].projectCount")
                        .value(contains(0)))
                .andExpect(jsonPath("$.categories[*].technologies[*].slug").value(not(hasItem("kubernetes"))))
                // Redis is used by the draft project only.
                .andExpect(jsonPath("$.categories[?(@.category == 'DATA')].technologies[?(@.slug == 'redis')].projectCount")
                        .value(contains(0)));
    }
}
