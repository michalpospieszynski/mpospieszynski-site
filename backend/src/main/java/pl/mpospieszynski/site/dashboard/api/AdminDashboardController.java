package pl.mpospieszynski.site.dashboard.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.ArrayList;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.contact.domain.MessagesAdminService;
import pl.mpospieszynski.site.contact.domain.MessagesAdminService.MessageListItem;
import pl.mpospieszynski.site.media.domain.MediaAdminService;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.AvailabilitySettings;
import pl.mpospieszynski.site.profile.domain.ProfileAdminService;
import pl.mpospieszynski.site.projects.domain.ProjectAdminService;
import pl.mpospieszynski.site.services.domain.ServicesAdminService;
import pl.mpospieszynski.site.shared.i18n.TranslationGap;
import pl.mpospieszynski.site.skills.domain.SkillsAdminService;

/**
 * The admin dashboard (docs/screens/admin/03-dashboard.md): what needs attention, gathered from each feature's
 * own service (no feature's tables are read here). Also feeds the sidebar's new-message badge.
 */
@RestController
class AdminDashboardController {

    record DashboardResponse(long newMessages, long draftProjects, AvailabilitySettings availability,
                             List<MessageListItem> recentMessages, List<TranslationGap> missingTranslations) {
    }

    private final MessagesAdminService messages;
    private final ProjectAdminService projects;
    private final ProfileAdminService profile;
    private final SkillsAdminService skills;
    private final ServicesAdminService services;
    private final MediaAdminService media;

    AdminDashboardController(MessagesAdminService messages, ProjectAdminService projects, ProfileAdminService profile,
                             SkillsAdminService skills, ServicesAdminService services, MediaAdminService media) {
        this.messages = messages;
        this.projects = projects;
        this.profile = profile;
        this.skills = skills;
        this.services = services;
        this.media = media;
    }

    @Operation(operationId = "getAdminDashboard")
    @GetMapping("/api/v1/admin/dashboard")
    @Transactional(readOnly = true)
    DashboardResponse dashboard() {
        List<TranslationGap> gaps = new ArrayList<>();
        gaps.addAll(profile.translationGaps());
        gaps.addAll(projects.translationGaps());
        gaps.addAll(services.translationGaps());
        gaps.addAll(skills.translationGaps());
        gaps.addAll(media.translationGaps());
        return new DashboardResponse(messages.newCount(), projects.draftCount(), profile.availability(),
                messages.recent(5), gaps);
    }
}
