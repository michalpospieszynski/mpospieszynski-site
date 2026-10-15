package pl.mpospieszynski.site.projects;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import pl.mpospieszynski.site.TestcontainersConfiguration;

/**
 * /api/v1/admin/projects (docs/screens/admin/05-projects-list.md, 06-project-editor.md) against the dev sample
 * content. Its own context (and database), because it changes data the public tests rely on.
 */
@SpringBootTest(properties = {"spring.flyway.locations=classpath:db/migration,classpath:db/dev", "test.isolation=admin-projects"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminProjectsTests {

    private static final String ORDERS = "00000000-0000-4000-8000-000000000101";
    private static final String DRAFT = "00000000-0000-4000-8000-000000000105";

    @Autowired
    MockMvc mvc;

    static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.with(admin()).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void needsTheAdminRole() throws Exception {
        mvc.perform(get("/api/v1/admin/projects")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/projects").with(jwt())).andExpect(status().isForbidden());
    }

    @Test
    void listsAllProjectsWithStatusAndEnglishState() throws Exception {
        mvc.perform(get("/api/v1/admin/projects").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + DRAFT + "')].status").value(contains("DRAFT")))
                .andExpect(jsonPath("$[?(@.titlePl == 'Raporty sprzedaży')].enStatus").value(contains("MISSING")))
                .andExpect(jsonPath("$[?(@.id == '" + ORDERS + "')].enStatus").value(contains("COMPLETE")));
        mvc.perform(get("/api/v1/admin/projects?status=DRAFT").with(admin()))
                .andExpect(jsonPath("$[*].id").value(hasItem(DRAFT)))
                .andExpect(jsonPath("$[*].id").value(not(hasItem(ORDERS))));
    }

    @Test
    void savesADraftWithOnlyATitleAndSlugAndRefusesPartialEnglish() throws Exception {
        String created = mvc.perform(json(post("/api/v1/admin/projects"), """
                        {"version": 0, "translations": {"pl": {"title": "Nowy projekt", "slug": "nowy-projekt"}}}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.id");
        int version = JsonPath.read(created, "$.version");

        mvc.perform(json(put("/api/v1/admin/projects/" + id), """
                        {"version": %d, "translations": {"pl": {"title": "Nowy projekt", "slug": "nowy-projekt"},
                                                          "en": {"title": "New project"}}}
                        """.formatted(version)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field").value(containsInAnyOrder("translations.en.slug", "translations.en.summary")));

        // Publishing lists what is missing.
        mvc.perform(post("/api/v1/admin/projects/" + id + "/publish").with(admin()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Aby opublikować, uzupełnij zaznaczone pola."))
                .andExpect(jsonPath("$.errors[*].field").value(not(hasItem("coverMediaId"))))
                .andExpect(jsonPath("$.errors[*].field").value(hasItem("translations.pl.summary")));
    }

    @Test
    void adminMessagesFollowTheAdminLanguage() throws Exception {
        // A bare draft (title and slug only) cannot be published.
        String created = mvc.perform(json(post("/api/v1/admin/projects"), """
                        {"version": 0, "translations": {"pl": {"title": "Tylko tytuł", "slug": "tylko-tytul"}}}
                        """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.id");

        mvc.perform(post("/api/v1/admin/projects/" + id + "/publish").with(admin()).header("Accept-Language", "en"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("To publish, fill in the highlighted fields."));
        mvc.perform(post("/api/v1/admin/projects/" + id + "/publish").with(admin()))
                .andExpect(jsonPath("$.detail").value("Aby opublikować, uzupełnij zaznaczone pola."));
        // The public API keeps following ?lang= only.
        mvc.perform(get("/api/v1/public/projects/nie-ma-takiego").header("Accept-Language", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Nie znaleziono"));
    }

    @Test
    void checksSlugsPerLanguage() throws Exception {
        mvc.perform(get("/api/v1/admin/projects/slug-available?locale=pl&slug=system-zamowien").with(admin()))
                .andExpect(jsonPath("$.available").value(false));
        mvc.perform(get("/api/v1/admin/projects/slug-available?locale=en&slug=system-zamowien").with(admin()))
                .andExpect(jsonPath("$.available").value(true));
        mvc.perform(get("/api/v1/admin/projects/slug-available?locale=pl&slug=system-zamowien&excludeId=" + ORDERS)
                        .with(admin()))
                .andExpect(jsonPath("$.available").value(true));
        mvc.perform(json(post("/api/v1/admin/projects"), """
                        {"version": 0, "translations": {"pl": {"title": "Kopia", "slug": "system-zamowien"}}}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("Ten adres jest już używany."));
    }

    @Test
    void refusesAStaleVersionAndReflectsChangesPublicly() throws Exception {
        String loaded = mvc.perform(get("/api/v1/admin/projects/" + ORDERS).with(admin()))
                .andExpect(jsonPath("$.galleryMediaIds.length()").value(2))
                .andExpect(jsonPath("$.translations.en.slug").value("order-processing-api"))
                .andReturn().getResponse().getContentAsString();
        String body = loaded.replace("\"Nocne przetwarzanie skrócone z 4 godzin do 25 minut.\"", "\"Szybciej niż kiedykolwiek.\"");

        // Warm the public cache first, then save: the change must show up anyway.
        mvc.perform(get("/api/v1/public/projects/system-zamowien?lang=pl"));
        mvc.perform(json(put("/api/v1/admin/projects/" + ORDERS), body)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/projects/system-zamowien?lang=pl"))
                .andExpect(jsonPath("$.summary").value("Szybciej niż kiedykolwiek."));

        // The same body again is what an editor left open in another tab sends: its version is now stale.
        mvc.perform(json(put("/api/v1/admin/projects/" + ORDERS), body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Te dane zostały zmienione w innej karcie. Odśwież, aby zobaczyć najnowszą wersję."));
    }

    @Test
    void savesAPublishedProjectWithoutAnyImage() throws Exception {
        String payments = "00000000-0000-4000-8000-000000000102";
        String loaded = mvc.perform(get("/api/v1/admin/projects/" + payments).with(admin()))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andReturn().getResponse().getContentAsString();
        String body = loaded
                .replaceAll("\"coverMediaId\":\"[^\"]*\"", "\"coverMediaId\":null")
                .replaceAll("\"galleryMediaIds\":\\[[^]]*]", "\"galleryMediaIds\":[]");

        mvc.perform(json(put("/api/v1/admin/projects/" + payments), body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mvc.perform(get("/api/v1/public/projects/migracja-platnosci?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cover").doesNotExist())
                .andExpect(jsonPath("$.gallery.length()").value(0));
    }

    @Test
    void previewsDraftsInBothLanguages() throws Exception {
        mvc.perform(get("/api/v1/admin/projects/" + DRAFT + "/preview?lang=pl").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Szkic projektu"));
        mvc.perform(get("/api/v1/admin/projects/" + DRAFT + "/preview?lang=en").with(admin()))
                .andExpect(jsonPath("$.title").value("Draft project"));
    }

    @Test
    void reordersArchivesAndDeletes() throws Exception {
        String sales = "00000000-0000-4000-8000-000000000104";
        mvc.perform(json(put("/api/v1/admin/projects/order"), "{\"ids\": [\"" + sales + "\", \"" + ORDERS + "\"]}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/admin/projects/" + sales + "/archive").with(admin()))
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
        mvc.perform(get("/api/v1/public/projects?lang=pl"))
                .andExpect(jsonPath("$[*].slug").value(not(hasItem("raporty-sprzedazy"))));
        mvc.perform(delete("/api/v1/admin/projects/" + sales).with(admin())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/admin/projects/" + sales).with(admin())).andExpect(status().isNotFound());
    }
}
