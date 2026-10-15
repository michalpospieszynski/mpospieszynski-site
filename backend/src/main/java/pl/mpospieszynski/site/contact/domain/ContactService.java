package pl.mpospieszynski.site.contact.domain;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.contact.infra.ContactStore;
import pl.mpospieszynski.site.contact.infra.TurnstileClient;
import pl.mpospieszynski.site.shared.web.ForbiddenException;
import pl.mpospieszynski.site.shared.web.IpHasher;
import pl.mpospieszynski.site.shared.web.TooManyRequestsException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;

/**
 * The contact form (docs/screens/public/08-contact.md, Backend): rate limit per hashed IP, honeypot, Turnstile,
 * validation, then store and announce the message. Mail goes out after the commit (ContactMailer).
 */
@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    /** Deliberately simple: one @, no spaces, a dot in the domain. The reply is the real check. */
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final ContactStore store;
    private final TurnstileClient turnstile;
    private final IpHasher ipHasher;
    private final ApplicationEventPublisher events;
    private final Cache<String, Bucket> buckets;
    private final int perHour;

    public ContactService(ContactStore store, TurnstileClient turnstile, IpHasher ipHasher,
                          ApplicationEventPublisher events, ContactProperties properties) {
        this.store = store;
        this.turnstile = turnstile;
        this.ipHasher = ipHasher;
        this.events = events;
        this.perHour = properties.perHour();
        this.buckets = Caffeine.newBuilder().expireAfterAccess(Duration.ofHours(2)).maximumSize(100_000).build();
    }

    /**
     * Returns the id of the stored message, or a random id for a filled honeypot (bots get the same answer as
     * people, and nothing is stored or sent).
     */
    @Transactional
    public UUID submit(ContactSubmission s, String clientIp) {
        String ipHash = ipHasher.hash(clientIp);
        if (!bucketFor(ipHash).tryConsume(1)) {
            throw new TooManyRequestsException("contact.errors.rateLimit");
        }
        if (s.website() != null && !s.website().isBlank()) {
            log.info("Contact form honeypot filled; message dropped");
            return UUID.randomUUID();
        }
        if (!turnstile.verify(s.turnstileToken(), clientIp)) {
            throw new ForbiddenException("contact.errors.bot");
        }
        ContactStore.NewMessage message = validate(s, ipHash);
        UUID id = store.insert(message);
        events.publishEvent(new ContactMessageReceived(id));
        return id;
    }

    private Bucket bucketFor(String ipHash) {
        return buckets.get(ipHash, key -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(perHour).refillIntervally(perHour, Duration.ofHours(1)).build())
                .build());
    }

    /** Mirrors the frontend validators and the table's check constraints; messages resolve in the form's language. */
    private ContactStore.NewMessage validate(ContactSubmission s, String ipHash) {
        List<FieldProblem> problems = new ArrayList<>();
        String topic = s.topic();
        if (topic == null || !ContactSubmission.TOPICS.contains(topic)) {
            problems.add(new FieldProblem("topic", "contact.errors.option"));
        }
        String name = trim(s.name());
        if (name == null) {
            problems.add(new FieldProblem("name", "contact.errors.required"));
        } else if (name.length() < 2 || name.length() > 120) {
            problems.add(new FieldProblem("name", "contact.errors.nameLength"));
        }
        String email = trim(s.email());
        if (email == null) {
            problems.add(new FieldProblem("email", "contact.errors.required"));
        } else if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            problems.add(new FieldProblem("email", "contact.errors.email"));
        }
        String company = trim(s.company());
        if (company != null && company.length() > 160) {
            problems.add(new FieldProblem("company", "contact.errors.companyLength"));
        }
        String text = trim(s.message());
        if (text == null) {
            problems.add(new FieldProblem("message", "contact.errors.required"));
        } else if (text.length() < 20 || text.length() > 5000) {
            problems.add(new FieldProblem("message", "contact.errors.messageLength"));
        }
        if (!s.consent()) {
            problems.add(new FieldProblem("consent", "contact.errors.consent"));
        }

        // Project details only for project enquiries; other topics drop them.
        boolean project = ContactSubmission.PROJECT.equals(topic);
        String budget = project ? trim(s.budgetRange()) : null;
        String timeline = project ? trim(s.timeline()) : null;
        if (budget != null && !ContactSubmission.BUDGETS.contains(budget)) {
            problems.add(new FieldProblem("budgetRange", "contact.errors.option"));
        }
        if (timeline != null && !ContactSubmission.TIMELINES.contains(timeline)) {
            problems.add(new FieldProblem("timeline", "contact.errors.option"));
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        UUID serviceId = project ? Optional.ofNullable(s.serviceId()).filter(store::isActiveService).orElse(null) : null;
        return new ContactStore.NewMessage(s.locale().code(), topic, name, email, company, serviceId, budget, timeline,
                text, ipHash);
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
