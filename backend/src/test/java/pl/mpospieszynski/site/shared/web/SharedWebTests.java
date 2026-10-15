package pl.mpospieszynski.site.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.TestcontainersConfiguration;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** B4: Server-Timing with app and db entries, cache hits, localised ProblemDetail errors and the lang parameter. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, SharedWebTests.Endpoints.class, SharedWebTests.CountingService.class})
class SharedWebTests {

    private static final String TIMING = "app;dur=\\d+\\.\\d, db;dur=\\d+\\.\\d(, cache;desc=hit)?";

    @Autowired
    MockMvc mvc;

    @Autowired
    ApplicationEventPublisher events;

    @Autowired
    CountingService counting;

    @Test
    void addsServerTimingWithAppAndDatabaseTime() throws Exception {
        String value = mvc.perform(get("/api/v1/public/test/query"))
                .andExpect(status().isOk())
                .andExpect(header().string("Server-Timing", matchesPattern(TIMING)))
                .andReturn().getResponse().getHeader("Server-Timing");

        double app = duration(value, "app");
        double db = duration(value, "db");
        assertThat(db).isPositive();
        assertThat(app).isGreaterThanOrEqualTo(db);
    }

    @Test
    void marksACachedResponseAndForgetsItAfterAContentChange() throws Exception {
        events.publishEvent(new ContentChangedEvent("test")); // start from an empty cache
        int before = counting.callCount();

        mvc.perform(get("/api/v1/public/test/cached?lang=pl"))
                .andExpect(header().string("Server-Timing", not(containsString("cache;desc=hit"))));
        mvc.perform(get("/api/v1/public/test/cached?lang=pl"))
                .andExpect(header().string("Server-Timing", containsString("cache;desc=hit")));
        assertThat(counting.callCount()).isEqualTo(before + 1);

        events.publishEvent(new ContentChangedEvent("test"));
        mvc.perform(get("/api/v1/public/test/cached?lang=pl"))
                .andExpect(header().string("Server-Timing", not(containsString("cache;desc=hit"))));
        assertThat(counting.callCount()).isEqualTo(before + 2);
    }

    @Test
    void notFoundIsAProblemDetailInTheRequestedLanguage() throws Exception {
        mvc.perform(get("/api/v1/public/test/missing?lang=en"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Type", containsString("application/problem+json")))
                .andExpect(jsonPath("$.title").value("Not found"))
                .andExpect(jsonPath("$.detail").value("This resource was not found."));
        mvc.perform(get("/api/v1/public/test/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Nie znaleziono tego zasobu."));
    }

    @Test
    void rejectsAnUnsupportedLanguage() throws Exception {
        mvc.perform(get("/api/v1/public/test/query?lang=de"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("lang"));
    }

    @Test
    void listsLocalisedFieldErrors() throws Exception {
        mvc.perform(get("/api/v1/public/test/validated?lang=en&name=&email=not-an-email"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Please correct the highlighted fields."))
                .andExpect(jsonPath("$.errors[*].field", hasItems("name", "email")))
                .andExpect(jsonPath("$.errors[*].message", hasItems("This field is required.", "Enter a valid email address.")));
        mvc.perform(get("/api/v1/public/test/validated?name=&email=a@b.pl"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("To pole jest wymagane."));
    }

    @Test
    void serviceValidationAndConflictsUseMessageKeys() throws Exception {
        mvc.perform(get("/api/v1/public/test/invalid?lang=en"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("translations.pl"))
                .andExpect(jsonPath("$.errors[0].message").value("The Polish version is required."));
        mvc.perform(get("/api/v1/public/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Ten adres jest już zajęty."));
    }

    private static double duration(String header, String name) {
        for (String part : header.split(",\\s*")) {
            if (part.startsWith(name + ";dur=")) {
                return Double.parseDouble(part.substring(name.length() + 5));
            }
        }
        throw new AssertionError(name + " missing in " + header);
    }

    record ValidationProbe(@NotBlank String name, @Email String email) {
    }

    @Service
    static class CountingService {

        private final AtomicInteger calls = new AtomicInteger();

        /** A method, not the field: the @Cacheable proxy has no state of its own. */
        public int callCount() {
            return calls.get();
        }

        @Cacheable(cacheNames = "test", key = "#lang")
        public String read(SiteLocale lang) {
            calls.incrementAndGet();
            return "value-" + lang;
        }
    }

    @RestController
    static class Endpoints {

        private final JdbcClient jdbc;
        private final CountingService counting;

        Endpoints(JdbcClient jdbc, CountingService counting) {
            this.jdbc = jdbc;
            this.counting = counting;
        }

        @GetMapping("/api/v1/public/test/query")
        long query(@RequestParam(defaultValue = "pl") SiteLocale lang) {
            return jdbc.sql("select count(*) from technology").query(Long.class).single();
        }

        @GetMapping("/api/v1/public/test/cached")
        String cached(@RequestParam(defaultValue = "pl") SiteLocale lang) {
            return counting.read(lang);
        }

        @GetMapping("/api/v1/public/test/missing")
        String missing() {
            throw new NotFoundException();
        }

        @GetMapping("/api/v1/public/test/invalid")
        String invalid() {
            throw new ValidationException("translations.pl", "problem.translation.plRequired");
        }

        @GetMapping("/api/v1/public/test/conflict")
        String conflict() {
            throw new ConflictException("problem.slug.taken");
        }

        /** Bean Validation on a bound object (the admin forms use it); errors come back per field and language. */
        @GetMapping("/api/v1/public/test/validated")
        String validated(@Valid @ModelAttribute ValidationProbe probe) {
            return "ok";
        }
    }
}
