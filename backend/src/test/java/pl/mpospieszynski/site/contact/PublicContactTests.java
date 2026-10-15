package pl.mpospieszynski.site.contact;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pl.mpospieszynski.site.TestcontainersConfiguration;
import pl.mpospieszynski.site.contact.infra.TurnstileClient;

/** POST /api/v1/public/contact (docs/screens/public/08-contact.md, acceptance criteria). */
@SpringBootTest(properties = {
        "spring.flyway.locations=classpath:db/migration,classpath:db/dev",
        "site.contact.owner-to=owner@example.test",
        "site.contact.from=site@example.test"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicContactTests {

    private static final String SERVICE_302 = "00000000-0000-4000-8000-000000000302";
    private static final String INACTIVE_305 = "00000000-0000-4000-8000-000000000305";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcClient jdbc;

    @MockitoBean
    TurnstileClient turnstile;

    @MockitoBean
    JavaMailSender mail;

    @BeforeEach
    void humansPass() {
        reset(mail);
        when(turnstile.verify(anyString(), anyString())).thenReturn(true);
    }

    private ResultActions send(String ip, String json) throws Exception {
        return mvc.perform(post("/api/v1/public/contact")
                .header("CF-Connecting-IP", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    /** A valid project enquiry; `extra` adds fields, starting with a comma. */
    private static String valid(String locale, String extra) {
        return "{\"locale\": \"" + locale + "\", \"topic\": \"PROJECT\", \"name\": \"Anna Nowak\","
                + " \"email\": \"anna@example.test\","
                + " \"message\": \"Szukam pomocy przy przyspieszeniu nocnego importu zamówień.\", \"consent\": true,"
                + " \"turnstileToken\": \"token\"" + extra + "}";
    }

    private long count(String sql, Object... params) {
        var spec = jdbc.sql(sql);
        for (int i = 0; i < params.length; i++) {
            spec = spec.param(i + 1, params[i]);
        }
        return spec.query(Long.class).single();
    }

    @Test
    void storesAValidMessageAndSendsTheNotificationAndAutoReplyInItsLanguage() throws Exception {
        String extra = ", \"company\": \"Acme\", \"serviceId\": \"" + SERVICE_302
                + "\", \"budgetRange\": \"MEDIUM\", \"timeline\": \"ASAP\"";
        String body = send("10.0.0.1", valid("en", extra))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").exists())
                .andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1"));

        assertThat(count("select count(*) from contact_message where id = ? and locale = 'en' and status = 'NEW' "
                + "and service_id = ?::uuid and budget_range = 'MEDIUM' and ip_hash is not null", id, SERVICE_302)).isOne();

        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, timeout(5_000).times(2)).send(sent.capture());
        List<SimpleMailMessage> messages = sent.getAllValues();
        SimpleMailMessage owner = messages.stream()
                .filter(m -> "owner@example.test".equals(m.getTo()[0])).findFirst().orElseThrow();
        assertThat(owner.getReplyTo()).isEqualTo("anna@example.test");
        assertThat(owner.getText()).contains("Przyspieszenie systemu", "Acme", "/admin/wiadomosci/" + id);
        SimpleMailMessage reply = messages.stream()
                .filter(m -> "anna@example.test".equals(m.getTo()[0])).findFirst().orElseThrow();
        assertThat(reply.getSubject()).isEqualTo("Thank you for your message");
    }

    @Test
    void returnsLocalisedFieldErrors() throws Exception {
        send("10.0.0.2", """
                {"locale": "en", "topic": "PROJECT", "name": "", "email": "nope", "message": "Too short",
                 "consent": false, "turnstileToken": "token", "budgetRange": "MILLIONS"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field").value(
                        containsInAnyOrder("name", "email", "message", "consent", "budgetRange")))
                .andExpect(jsonPath("$.errors[?(@.field == 'email')].message").value(
                        containsInAnyOrder("Enter a valid email address – I'll reply to it.")))
                .andExpect(jsonPath("$.errors[?(@.field == 'message')].message").value(
                        containsInAnyOrder("The message should be 20 to 5,000 characters long.")));

        send("10.0.0.2", """
                {"locale": "pl", "topic": "OTHER", "name": "Jan", "email": "jan@example.test", "message": "",
                 "consent": true, "turnstileToken": "token"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("To pole jest wymagane."));
    }

    @Test
    void dropsProjectDetailsForOtherTopicsAndIgnoresInactiveServices() throws Exception {
        String sql = "select count(*) from contact_message where name = 'Anna Nowak' and budget_range is null and service_id is null";
        long before = count(sql);
        send("10.0.0.3", valid("pl", ", \"serviceId\": \"" + INACTIVE_305 + "\"")).andExpect(status().isAccepted());
        send("10.0.0.3", valid("pl", ", \"budgetRange\": \"SMALL\"").replace("PROJECT", "CONSULTATION"))
                .andExpect(status().isAccepted());
        assertThat(count(sql)).isEqualTo(before + 2);
    }

    @Test
    void acceptsAFilledHoneypotWithoutStoringOrSending() throws Exception {
        long before = count("select count(*) from contact_message");
        send("10.0.0.4", valid("pl", ", \"website\": \"http://spam.test\"")).andExpect(status().isAccepted());
        assertThat(count("select count(*) from contact_message")).isEqualTo(before);
        verify(mail, after(500).never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void refusesTheSixthMessageWithinAnHourFromTheSameAddress() throws Exception {
        for (int i = 0; i < 5; i++) {
            send("10.0.0.5", valid("pl", "")).andExpect(status().isAccepted());
        }
        send("10.0.0.5", valid("en", ""))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.detail").value("Too many messages sent. Try again in an hour."));
        // Another address is not affected.
        send("10.0.0.6", valid("pl", "")).andExpect(status().isAccepted());
    }

    @Test
    void refusesAFailedBotCheckInTheFormLanguage() throws Exception {
        when(turnstile.verify(anyString(), anyString())).thenReturn(false);
        long before = count("select count(*) from contact_message");
        send("10.0.0.7", valid("pl", ""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(
                        "Nie udało się potwierdzić, że wiadomość wysyła człowiek. Odśwież stronę i spróbuj ponownie."));
        assertThat(count("select count(*) from contact_message")).isEqualTo(before);
    }
}
