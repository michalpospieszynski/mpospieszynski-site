package pl.mpospieszynski.site.services;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
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
 * GET /api/v1/public/services against the dev sample content (docs/screens/public/06-services.md): four active
 * offerings (304 Polish only), one inactive (305), three FAQ items.
 */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/dev")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicServicesTests {

    @Autowired
    MockMvc mvc;

    @Test
    void listsActiveServicesInOrderWithTheFaq() throws Exception {
        mvc.perform(get("/api/v1/public/services?lang=pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.services[*].title").value(contains(
                        "Nowy backend", "Przyspieszenie systemu", "Konsultacje", "Audyt bezpieczeństwa API")))
                .andExpect(jsonPath("$.services[0].deliverablesMd").value("- Projekt API\n- Implementacja i testy\n- Wdrożenie"))
                .andExpect(jsonPath("$.services[0].priceNote").value("Wycena po rozmowie"))
                .andExpect(jsonPath("$.services[0].descriptionMd").exists())
                .andExpect(jsonPath("$.faq", hasSize(3)))
                .andExpect(jsonPath("$.faq[0].question").value("Czy pracujesz zdalnie?"));
    }

    @Test
    void fallsBackToPolishPerService() throws Exception {
        mvc.perform(get("/api/v1/public/services?lang=en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.services[*].lang").value(contains("en", "en", "en", "pl")))
                .andExpect(jsonPath("$.services[0].priceNote").value("Quoted after a call"))
                .andExpect(jsonPath("$.services[3].title").value("Audyt bezpieczeństwa API"))
                .andExpect(jsonPath("$.faq[1].question").value("What is the first step?"));
    }
}
