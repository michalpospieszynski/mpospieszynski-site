package pl.mpospieszynski.site.profile.infra;

import org.springframework.data.jpa.repository.JpaRepository;
import pl.mpospieszynski.site.profile.domain.SiteSettings;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, Short> {

    short SETTINGS_ID = 1;
}
