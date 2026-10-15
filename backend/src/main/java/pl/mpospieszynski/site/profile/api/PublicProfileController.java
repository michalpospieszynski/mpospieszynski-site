package pl.mpospieszynski.site.profile.api;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.profile.domain.ProfileService;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.web.PublicCaching;

@RestController
@RequestMapping("/api/v1/public/profile")
class PublicProfileController {

    private final ProfileService profiles;

    PublicProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

    @Operation(operationId = "getPublicProfile", summary = "Owner profile in a language (Polish fallback)")
    @GetMapping
    ResponseEntity<ProfileResponse> profile(@RequestParam(defaultValue = "pl") SiteLocale lang) {
        return ResponseEntity.ok().cacheControl(PublicCaching.READ).body(ProfileResponse.from(profiles.publicProfile(lang)));
    }
}
