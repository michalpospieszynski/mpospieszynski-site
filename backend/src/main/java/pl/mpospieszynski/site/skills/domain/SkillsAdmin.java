package pl.mpospieszynski.site.skills.domain;

import java.util.List;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;

/** What the admin skills screen exchanges (docs/screens/admin/07-skills.md). */
public final class SkillsAdmin {

    private SkillsAdmin() {
    }

    public record TechnologyTexts(String description) {
    }

    public record TechnologyTranslations(TechnologyTexts pl, TechnologyTexts en) {
    }

    /** `slug` may be blank (made from the name); `category` defaults to TOOLING (inline creation in the editor). */
    public record TechnologyInput(long version, String slug, String name, TechnologyCategory category,
                                  Boolean showOnSkillsPage, Short sinceYear, TechnologyTranslations translations) {
    }

    public record AdminTechnology(UUID id, long version, String slug, String name, TechnologyCategory category,
                                  boolean showOnSkillsPage, Short sinceYear, int sortOrder, long projectCount,
                                  TranslationStatus enStatus, TechnologyTranslations translations) {
    }

    public record AreaTexts(String title, String summary, String descriptionMd) {
    }

    public record AreaTranslations(AreaTexts pl, AreaTexts en) {
    }

    public record AreaInput(long version, List<UUID> technologyIds, List<UUID> projectIds, AreaTranslations translations) {
    }

    public record AdminExpertiseArea(UUID id, long version, int sortOrder, List<UUID> technologyIds,
                                     List<UUID> projectIds, TranslationStatus enStatus, AreaTranslations translations) {
    }
}
