package pl.mpospieszynski.site;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * The admin endpoints for skills, services and FAQ, settings, media, messages and the dashboard
 * (docs/screens/admin/03, 04, 07–10), against the dev sample content in their own database.
 */
@SpringBootTest(properties = {
        "spring.flyway.locations=classpath:db/migration,classpath:db/dev",
        "site.storage.type=local",
        "site.storage.local-dir=build/test-media",
        "test.isolation=admin-content"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminContentTests {

    @Autowired
    MockMvc mvc;

    static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.with(admin()).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private String body(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.with(admin())).andReturn().getResponse().getContentAsString();
    }

    // Skills -----------------------------------------------------------------------------------------------

    @Test
    void createsTechnologiesFromANameAndBlocksDeletingUsedOnes() throws Exception {
        mvc.perform(json(post("/api/v1/admin/technologies"), "{\"version\": 0, \"name\": \"Spring Batch\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("spring-batch"))
                .andExpect(jsonPath("$.category").value("TOOLING"));
        // Java: three published projects and the draft.
        String list = body(get("/api/v1/admin/technologies"));
        assertCount(JsonPath.<List<Integer>>read(list, "$[?(@.slug == 'java')].projectCount").get(0), 4);
        String java = JsonPath.<List<String>>read(list, "$[?(@.slug == 'java')].id").get(0);
        mvc.perform(delete("/api/v1/admin/technologies/" + java).with(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "Tej technologii używa 4 projektów. Usuń ją najpierw z projektów albo ukryj ją na stronie."));
    }

    @Test
    void editsTechnologyDescriptionsAndShowsThemPublicly() throws Exception {
        String list = body(get("/api/v1/admin/technologies"));
        String id = JsonPath.<List<String>>read(list, "$[?(@.slug == 'rxjs')].id").get(0);
        int version = JsonPath.<List<Integer>>read(list, "$[?(@.slug == 'rxjs')].version").get(0);
        mvc.perform(json(put("/api/v1/admin/technologies/" + id), """
                        {"version": %d, "name": "RxJS", "slug": "rxjs", "category": "FRONTEND", "showOnSkillsPage": true,
                         "sinceYear": 2018, "translations": {"pl": {"description": "Strumienie w Angularze."}}}
                        """.formatted(version)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enStatus").value("MISSING"));
        mvc.perform(get("/api/v1/public/skills?lang=pl"))
                .andExpect(jsonPath("$.categories[?(@.category == 'FRONTEND')].technologies[?(@.slug == 'rxjs')].description")
                        .value(contains("Strumienie w Angularze.")));
    }

    @Test
    void managesExpertiseAreas() throws Exception {
        String created = mvc.perform(json(post("/api/v1/admin/expertise-areas"), """
                        {"version": 0, "projectIds": ["00000000-0000-4000-8000-000000000101"],
                         "translations": {"pl": {"title": "Integracje", "summary": "Kafka i REST."}}}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enStatus").value("MISSING"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/public/skills?lang=pl"))
                .andExpect(jsonPath("$.areas[*].title").value(hasItem("Integracje")));
        mvc.perform(json(post("/api/v1/admin/expertise-areas"), """
                        {"version": 0, "translations": {"pl": {"title": "X", "summary": "Y"}, "en": {"title": "Only title"}}}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field").value(contains("translations.en.summary")));
        mvc.perform(delete("/api/v1/admin/expertise-areas/" + JsonPath.read(created, "$.id")).with(admin()))
                .andExpect(status().isNoContent());
    }

    // Services and FAQ -------------------------------------------------------------------------------------

    @Test
    void togglesServicesAndBlocksDeletingOnesLinkedToMessages() throws Exception {
        String services = body(get("/api/v1/admin/services"));
        String id = JsonPath.read(services, "$[0].id");
        int version = JsonPath.read(services, "$[0].version");
        mvc.perform(json(patch("/api/v1/admin/services/" + id), "{\"active\": false, \"version\": " + version + "}"))
                .andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/v1/public/services?lang=pl"))
                .andExpect(jsonPath("$.services[*].id").value(not(hasItem(id))));

        // The sample message 501 refers to service 302.
        mvc.perform(delete("/api/v1/admin/services/00000000-0000-4000-8000-000000000302").with(admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Ta usługa jest powiązana z 1 wiadomościami. Zamiast usuwać, wyłącz ją."));
        mvc.perform(get("/api/v1/admin/services").with(admin()))
                .andExpect(jsonPath("$[?(@.translations.pl.title == 'Audyt bezpieczeństwa API')].enStatus").value(contains("MISSING")));
    }

    @Test
    void managesFaq() throws Exception {
        String created = mvc.perform(json(post("/api/v1/admin/faq"), """
                        {"version": 0, "translations": {"pl": {"question": "Ile to kosztuje?", "answerMd": "Zależy od zakresu."},
                                                        "en": {"question": "How much?", "answerMd": "It depends."}}}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enStatus").value("COMPLETE"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/public/services?lang=en")).andExpect(jsonPath("$.faq[*].question").value(hasItem("How much?")));
        mvc.perform(delete("/api/v1/admin/faq/" + JsonPath.read(created, "$.id")).with(admin())).andExpect(status().isNoContent());
    }

    // Settings ---------------------------------------------------------------------------------------------

    @Test
    void savesSettingsAndRequiresACompleteEnglishVersion() throws Exception {
        String loaded = mvc.perform(get("/api/v1/admin/profile").with(admin()))
                .andExpect(jsonPath("$.socialLinks.github").value("https://github.com/"))
                .andReturn().getResponse().getContentAsString();
        String changed = loaded.replace("Spokojne systemy dla ważnych procesów", "Szybkie i spokojne backendy");
        mvc.perform(json(put("/api/v1/admin/profile"), changed)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/profile?lang=pl")).andExpect(jsonPath("$.headline").value("Szybkie i spokojne backendy"));

        String current = body(get("/api/v1/admin/profile"));
        mvc.perform(json(put("/api/v1/admin/profile"), current.replace("\"Thank you for your message\"", "\"\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field").value(contains("translations.en.autoreplySubject")));
        mvc.perform(json(put("/api/v1/admin/profile"), current.replace("\"https://github.com/\"", "\"http://github.com\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field").value(contains("socialLinks.github")));
    }

    // Media ------------------------------------------------------------------------------------------------

    @Test
    void uploadsImagesChecksTheRealTypeAndProtectsUsedFiles() throws Exception {
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(40, 30, BufferedImage.TYPE_INT_RGB), "png", png);

        String uploaded = mvc.perform(multipart("/api/v1/admin/media")
                        .file(new MockMultipartFile("file", "photo.png", "image/png", png.toByteArray())).with(admin()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.width").value(40))
                .andExpect(jsonPath("$.height").value(30))
                .andExpect(jsonPath("$.mimeType").value("image/png"))
                .andExpect(jsonPath("$.originalName").value("photo.png"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(get((String) JsonPath.read(uploaded, "$.url")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("immutable")));

        // An SVG renamed to .png is refused by its bytes, not its name.
        mvc.perform(multipart("/api/v1/admin/media")
                        .file(new MockMultipartFile("file", "x.png", "image/png", "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes()))
                        .with(admin()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Nieobsługiwany typ pliku. Dozwolone: JPG, PNG, WebP."));

        String id = JsonPath.read(uploaded, "$.id");
        int version = JsonPath.read(uploaded, "$.version");
        mvc.perform(json(put("/api/v1/admin/media/" + id), """
                        {"version": %d, "translations": {"pl": {"altText": "Zdjęcie testowe"}, "en": {"altText": "Test photo"}}}
                        """.formatted(version)))
                .andExpect(jsonPath("$.translations.en.altText").value("Test photo"));
        mvc.perform(delete("/api/v1/admin/media/" + id).with(admin())).andExpect(status().isNoContent());

        // The sample cover of project 101 is in use.
        mvc.perform(get("/api/v1/admin/media/00000000-0000-4000-8000-000000000601/usages").with(admin()))
                .andExpect(jsonPath("$[*].role").value(hasItem("cover")));
        mvc.perform(delete("/api/v1/admin/media/00000000-0000-4000-8000-000000000601").with(admin()))
                .andExpect(status().isConflict());
    }

    // Messages and dashboard -------------------------------------------------------------------------------

    @Test
    void listsMessagesMarksThemReadAndCountsThemOnTheDashboard() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard").with(admin()))
                .andExpect(jsonPath("$.newMessages").value(greaterThan(0)))
                .andExpect(jsonPath("$.draftProjects").value(1))
                .andExpect(jsonPath("$.availability.status").value("LIMITED"))
                .andExpect(jsonPath("$.missingTranslations[*].type").value(hasItem("PROJECT")))
                .andExpect(jsonPath("$.missingTranslations[*].label").value(hasItem("Raporty sprzedaży")));

        String page = mvc.perform(get("/api/v1/admin/messages?status=NEW").with(admin()))
                .andExpect(jsonPath("$.counts.NEW").value(greaterThan(0)))
                .andExpect(jsonPath("$.counts.SPAM").value(0))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(page, "$.items[0].id");
        mvc.perform(get("/api/v1/admin/messages/" + id).with(admin()))
                .andExpect(jsonPath("$.status").value("READ"))
                .andExpect(jsonPath("$.budgetRange").value("MEDIUM"));
        mvc.perform(json(patch("/api/v1/admin/messages/" + id), "{\"status\": \"REPLIED\"}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/admin/messages?status=REPLIED").with(admin()))
                .andExpect(jsonPath("$.items[*].id").value(hasItem(id)));
        mvc.perform(get("/api/v1/admin/messages?q=nonexistent-text").with(admin())).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/admin/messages?q=raport").with(admin())).andExpect(jsonPath("$.total").value(1));
        mvc.perform(delete("/api/v1/admin/messages/" + id).with(admin())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/admin/messages/" + id).with(admin())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/messages?status=JOB").with(admin())).andExpect(status().isBadRequest());
    }

    private static void assertCount(int actual, int expected) {
        org.assertj.core.api.Assertions.assertThat(actual).isEqualTo(expected);
    }
}
