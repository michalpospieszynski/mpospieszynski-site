package pl.mpospieszynski.site.profile.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.contact.domain.ContactMailer;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.AdminProfile;
import pl.mpospieszynski.site.profile.domain.ProfileAdmin.ProfileInput;
import pl.mpospieszynski.site.profile.domain.ProfileAdminService;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** Admin settings (docs/screens/admin/10-settings.md). */
@RestController
@RequestMapping("/api/v1/admin/profile")
class AdminProfileController {

    record TestMailResult(boolean sent) {
    }

    private final ProfileAdminService profile;
    private final ContactMailer mailer;

    AdminProfileController(ProfileAdminService profile, ContactMailer mailer) {
        this.profile = profile;
        this.mailer = mailer;
    }

    @Operation(operationId = "getAdminProfile")
    @GetMapping
    AdminProfile get() {
        return profile.get();
    }

    @Operation(operationId = "saveAdminProfile", summary = "Save; 409 when the version is stale")
    @PutMapping
    AdminProfile save(@RequestBody ProfileInput input) {
        return profile.save(input);
    }

    @Operation(operationId = "sendTestAutoReply", summary = "Sends the saved auto-reply in `locale` to the owner's address")
    @PostMapping("/test-autoreply")
    TestMailResult testAutoReply(@RequestParam(defaultValue = "pl") SiteLocale locale) {
        return new TestMailResult(mailer.sendTestAutoReply(locale.code(), profile.fullName()));
    }
}
