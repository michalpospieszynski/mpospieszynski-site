package pl.mpospieszynski.site.projects;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
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

/**
 * GET /api/v1/public/projects and /technologies against the dev sample content
 * (docs/screens/public/03-projects-list.md): four published projects (101–104, 104 Polish only) and draft 105.
 */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/dev")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicProjectsTests {

    @Autowired
    MockMvc mvc;

    @Test
    void listsPublishedProjectsOnlyFeaturedFirst() throws Exception {
        mvc.perform(get("/api/v1/public/projects?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=60")))
                .andExpect(jsonPath("$[*].slug").value(contains(
                        "system-zamowien", "migracja-platnosci", "jak-zbudowana-jest-ta-strona", "raporty-sprzedazy")))
                .andExpect(jsonPath("$[*].featured").value(contains(true, true, true, false)))
                .andExpect(jsonPath("$[0].lang").value("pl"))
                .andExpect(jsonPath("$[0].kind").value("CLIENT"))
                .andExpect(jsonPath("$[0].summary").value("Nocne przetwarzanie skrócone z 4 godzin do 25 minut."))
                .andExpect(jsonPath("$[0].translations.en").value("order-processing-api"))
                .andExpect(jsonPath("$[0].technologies[*].slug").value(hasItem("spring-boot")))
                .andExpect(jsonPath("$[0].startedOn").value("2024-03-01"));
    }

    @Test
    void fallsBackToPolishForProjectsWithoutAnEnglishVersion() throws Exception {
        mvc.perform(get("/api/v1/public/projects?lang=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].lang").value("en"))
                .andExpect(jsonPath("$[0].slug").value("order-processing-api"))
                .andExpect(jsonPath("$[3].lang").value("pl"))
                .andExpect(jsonPath("$[3].slug").value("raporty-sprzedazy"))
                .andExpect(jsonPath("$[3].translations.pl").value("raporty-sprzedazy"))
                .andExpect(jsonPath("$[3].translations.en").doesNotExist());
    }

    @Test
    void filtersByKindAndTechnology() throws Exception {
        mvc.perform(get("/api/v1/public/projects?lang=pl&kind=CLIENT&tech=docker"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug").value(contains("migracja-platnosci")));
        mvc.perform(get("/api/v1/public/projects?lang=pl&featured=false"))
                .andExpect(jsonPath("$[*].slug").value(contains("raporty-sprzedazy")));
    }

    @Test
    void ignoresUnknownFilterValues() throws Exception {
        mvc.perform(get("/api/v1/public/projects?lang=pl&kind=SECRET&tech=cobol"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)));
    }

    @Test
    void returnsACaseStudyWithItsStoryGalleryAndNeighbours() throws Exception {
        mvc.perform(get("/api/v1/public/projects/system-zamowien?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lang").value("pl"))
                .andExpect(jsonPath("$.title").value("System przetwarzania zamówień"))
                .andExpect(jsonPath("$.translations.en").value("order-processing-api"))
                .andExpect(jsonPath("$.solutionMd").value(containsString("```java")))
                .andExpect(jsonPath("$.lessonsMd").value("Najpierw pomiar, potem zmiany: połowę zysku dały dwa indeksy."))
                .andExpect(jsonPath("$.cover.url").value("/media/sample-orders-before-after.svg"))
                .andExpect(jsonPath("$.cover.width").value(1200))
                .andExpect(jsonPath("$.gallery[*].url").value(contains(
                        "/media/sample-orders-architecture.svg", "/media/sample-orders-outbox.svg")))
                .andExpect(jsonPath("$.gallery[0].caption").value("Przetwarzanie w partiach z równoległymi workerami."))
                .andExpect(jsonPath("$.previous").doesNotExist())
                .andExpect(jsonPath("$.next.slug").value("migracja-platnosci"));
    }

    @Test
    void keepsPreviousAndNextWithinTheLanguage() throws Exception {
        // Polish: 103 is followed by the Polish-only 104; English has no 104, so 103 is the last one.
        mvc.perform(get("/api/v1/public/projects/jak-zbudowana-jest-ta-strona?lang=pl"))
                .andExpect(jsonPath("$.next.slug").value("raporty-sprzedazy"));
        mvc.perform(get("/api/v1/public/projects/how-this-site-is-built?lang=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previous.slug").value("payments-migration"))
                .andExpect(jsonPath("$.next").doesNotExist())
                .andExpect(jsonPath("$.gallery", hasSize(0)));
    }

    @Test
    void answers404ForUnknownDraftOrOtherLanguageSlugs() throws Exception {
        mvc.perform(get("/api/v1/public/projects/unknown-slug?lang=pl")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/public/projects/szkic-projektu?lang=pl")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/public/projects/system-zamowien?lang=en")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/public/projects/raporty-sprzedazy?lang=en")).andExpect(status().isNotFound());
    }

    @Test
    void listsTechnologiesOfPublishedProjectsWithCounts() throws Exception {
        mvc.perform(get("/api/v1/public/technologies?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'postgresql')].projectCount").value(contains(3)))
                .andExpect(jsonPath("$[?(@.slug == 'java')].projectCount").value(contains(3)))
                .andExpect(jsonPath("$[?(@.slug == 'java')].category").value(contains("LANGUAGE")))
                // Redis is only used by the draft project.
                .andExpect(jsonPath("$[*].slug").value(not(hasItem("redis"))));
    }
}
