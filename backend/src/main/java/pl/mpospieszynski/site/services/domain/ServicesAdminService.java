package pl.mpospieszynski.site.services.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.AdminFaq;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.AdminService;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.FaqInput;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.FaqTexts;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.ServiceInput;
import pl.mpospieszynski.site.services.domain.ServicesAdmin.ServiceTexts;
import pl.mpospieszynski.site.services.infra.FaqRepository;
import pl.mpospieszynski.site.services.infra.ServiceOfferingRepository;
import pl.mpospieszynski.site.shared.cache.ContentChangedEvent;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;
import pl.mpospieszynski.site.shared.web.ConflictException;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;
import pl.mpospieszynski.site.shared.web.ValidationException.FieldProblem;

/** Admin commands for service offerings and the FAQ (docs/screens/admin/08-services-faq.md). */
@Service
public class ServicesAdminService {

    private final ServiceOfferingRepository services;
    private final FaqRepository faqs;
    private final ApplicationEventPublisher events;

    public ServicesAdminService(ServiceOfferingRepository services, FaqRepository faqs, ApplicationEventPublisher events) {
        this.services = services;
        this.faqs = faqs;
        this.events = events;
    }

    // Services -------------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminService> listServices() {
        return services.findAll().stream().sorted(Comparator.comparingInt(ServiceOffering::sortOrder)).map(this::view).toList();
    }

    @Transactional
    public AdminService createService(ServiceInput in) {
        ServiceOffering service = new ServiceOffering(services.maxSortOrder() + 10);
        applyService(service, in);
        AdminService view = view(services.saveAndFlush(service));
        changed();
        return view;
    }

    @Transactional
    public AdminService saveService(UUID id, ServiceInput in) {
        ServiceOffering service = services.findById(id).orElseThrow(NotFoundException::new);
        checkVersion(service.version(), in.version());
        applyService(service, in);
        AdminService view = view(services.saveAndFlush(service));
        changed();
        return view;
    }

    @Transactional
    public AdminService setActive(UUID id, long version, boolean active) {
        ServiceOffering service = services.findById(id).orElseThrow(NotFoundException::new);
        checkVersion(service.version(), version);
        service.setActive(active);
        AdminService view = view(services.saveAndFlush(service));
        changed();
        return view;
    }

    /** Messages keep their service reference, so a linked service is deactivated instead (409). */
    @Transactional
    public void deleteService(UUID id) {
        ServiceOffering service = services.findById(id).orElseThrow(NotFoundException::new);
        long messages = services.messageCount(id);
        if (messages > 0) {
            throw new ConflictException("admin.service.inUse", messages);
        }
        services.delete(service);
        changed();
    }

    @Transactional
    public void reorderServices(List<UUID> ids) {
        for (int i = 0; i < ids.size(); i++) {
            int order = (i + 1) * 10;
            services.findById(ids.get(i)).ifPresent(s -> s.setSortOrder(order));
        }
        changed();
    }

    private void applyService(ServiceOffering service, ServiceInput in) {
        List<FieldProblem> problems = new ArrayList<>();
        ServiceTexts pl = in.translations() == null ? null : in.translations().pl();
        ServiceTexts en = in.translations() == null ? null : in.translations().en();
        if (pl == null || blank(pl.title())) {
            problems.add(new FieldProblem("translations.pl.title", "admin.errors.required"));
        }
        if (pl == null || blank(pl.summary())) {
            problems.add(new FieldProblem("translations.pl.summary", "admin.errors.required"));
        }
        if (en != null && allBlank(en.title(), en.summary(), en.descriptionMd(), en.deliverablesMd(), en.priceNote())) {
            en = null;
        }
        if (en != null) {
            if (blank(en.title())) {
                problems.add(new FieldProblem("translations.en.title", "admin.errors.enRequired"));
            }
            if (blank(en.summary())) {
                problems.add(new FieldProblem("translations.en.summary", "admin.errors.enRequired"));
            }
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        service.edit(in.active() == null || in.active(), new ServiceOffering.Text(pl), en == null ? null : new ServiceOffering.Text(en));
    }

    private AdminService view(ServiceOffering s) {
        ServiceOffering.Text en = s.text("en");
        return new AdminService(s.id(), s.version(), s.active(), s.sortOrder(), serviceStatus(s),
                new ServicesAdmin.ServiceTranslations(s.text("pl").toTexts(), en == null ? null : en.toTexts()));
    }

    private static TranslationStatus serviceStatus(ServiceOffering s) {
        ServiceOffering.Text en = s.text("en");
        return TranslationStatus.of(fields(s.text("pl").toTexts()), en == null ? null : fields(en.toTexts()));
    }

    private static List<String> fields(ServiceTexts t) {
        return Arrays.asList(t.title(), t.summary(), t.descriptionMd(), t.deliverablesMd(), t.priceNote());
    }

    // FAQ ------------------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AdminFaq> listFaq() {
        return faqs.findAll().stream().sorted(Comparator.comparingInt(Faq::sortOrder)).map(this::view).toList();
    }

    @Transactional
    public AdminFaq createFaq(FaqInput in) {
        Faq faq = new Faq(faqs.maxSortOrder() + 10);
        applyFaq(faq, in);
        AdminFaq view = view(faqs.saveAndFlush(faq));
        changed();
        return view;
    }

    @Transactional
    public AdminFaq saveFaq(UUID id, FaqInput in) {
        Faq faq = faqs.findById(id).orElseThrow(NotFoundException::new);
        checkVersion(faq.version(), in.version());
        applyFaq(faq, in);
        AdminFaq view = view(faqs.saveAndFlush(faq));
        changed();
        return view;
    }

    @Transactional
    public void deleteFaq(UUID id) {
        faqs.delete(faqs.findById(id).orElseThrow(NotFoundException::new));
        changed();
    }

    @Transactional
    public void reorderFaq(List<UUID> ids) {
        for (int i = 0; i < ids.size(); i++) {
            int order = (i + 1) * 10;
            faqs.findById(ids.get(i)).ifPresent(f -> f.setSortOrder(order));
        }
        changed();
    }

    private void applyFaq(Faq faq, FaqInput in) {
        List<FieldProblem> problems = new ArrayList<>();
        FaqTexts pl = in.translations() == null ? null : in.translations().pl();
        FaqTexts en = in.translations() == null ? null : in.translations().en();
        if (pl == null || blank(pl.question())) {
            problems.add(new FieldProblem("translations.pl.question", "admin.errors.required"));
        }
        if (pl == null || blank(pl.answerMd())) {
            problems.add(new FieldProblem("translations.pl.answerMd", "admin.errors.required"));
        }
        if (en != null && allBlank(en.question(), en.answerMd())) {
            en = null;
        }
        if (en != null) {
            if (blank(en.question())) {
                problems.add(new FieldProblem("translations.en.question", "admin.errors.enRequired"));
            }
            if (blank(en.answerMd())) {
                problems.add(new FieldProblem("translations.en.answerMd", "admin.errors.enRequired"));
            }
        }
        if (!problems.isEmpty()) {
            throw new ValidationException(problems);
        }
        faq.edit(new Faq.Text(pl), en == null ? null : new Faq.Text(en));
    }

    private AdminFaq view(Faq f) {
        Faq.Text en = f.text("en");
        return new AdminFaq(f.id(), f.version(), f.sortOrder(), faqStatus(f),
                new ServicesAdmin.FaqTranslations(f.text("pl").toTexts(), en == null ? null : en.toTexts()));
    }

    private static TranslationStatus faqStatus(Faq f) {
        Faq.Text en = f.text("en");
        FaqTexts pl = f.text("pl").toTexts();
        return TranslationStatus.of(List.of(pl.question(), pl.answerMd()),
                en == null ? null : List.of(en.toTexts().question(), en.toTexts().answerMd()));
    }

    // Dashboard ------------------------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TranslationGap> translationGaps() {
        List<TranslationGap> gaps = new ArrayList<>();
        for (ServiceOffering s : services.findAll()) {
            TranslationStatus status = serviceStatus(s);
            if (s.active() && status != TranslationStatus.COMPLETE) {
                gaps.add(new TranslationGap(TranslationGap.Type.SERVICE, s.id(), s.text("pl").toTexts().title(), status));
            }
        }
        for (Faq f : faqs.findAll()) {
            TranslationStatus status = faqStatus(f);
            if (status != TranslationStatus.COMPLETE) {
                gaps.add(new TranslationGap(TranslationGap.Type.FAQ, f.id(), f.text("pl").toTexts().question(), status));
            }
        }
        return gaps;
    }

    private void changed() {
        events.publishEvent(new ContentChangedEvent("services"));
    }

    private static void checkVersion(long current, long submitted) {
        if (current != submitted) {
            throw new ConflictException("admin.errors.staleVersion");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean allBlank(String... values) {
        return Arrays.stream(values).allMatch(ServicesAdminService::blank);
    }
}
