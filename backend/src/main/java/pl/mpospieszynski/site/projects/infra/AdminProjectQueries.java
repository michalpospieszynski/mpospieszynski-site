package pl.mpospieszynski.site.projects.infra;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** SQL for the admin side of projects: links, ordering, slug checks and lookups the editor needs. */
@Repository
public class AdminProjectQueries {

    private final JdbcClient jdbc;

    public AdminProjectQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<UUID> technologyIds(UUID projectId) {
        return jdbc.sql("""
                        select pt.technology_id from project_technology pt join technology t on t.id = pt.technology_id
                        where pt.project_id = :id order by t.sort_order, t.name
                        """)
                .param("id", projectId).query(UUID.class).list();
    }

    public List<UUID> galleryIds(UUID projectId) {
        return jdbc.sql("select media_id from project_media where project_id = :id order by sort_order")
                .param("id", projectId).query(UUID.class).list();
    }

    public List<UUID> areaIds(UUID projectId) {
        return jdbc.sql("select area_id from expertise_area_project where project_id = :id")
                .param("id", projectId).query(UUID.class).list();
    }

    /** Replaces all links of a project in the caller's transaction. */
    public void replaceLinks(UUID projectId, List<UUID> technologies, List<UUID> gallery, List<UUID> areas) {
        jdbc.sql("delete from project_technology where project_id = :id").param("id", projectId).update();
        jdbc.sql("delete from project_media where project_id = :id").param("id", projectId).update();
        jdbc.sql("delete from expertise_area_project where project_id = :id").param("id", projectId).update();
        for (UUID technology : technologies) {
            jdbc.sql("insert into project_technology (project_id, technology_id) values (:p, :t)")
                    .param("p", projectId).param("t", technology).update();
        }
        for (int i = 0; i < gallery.size(); i++) {
            jdbc.sql("insert into project_media (project_id, media_id, sort_order) values (:p, :m, :o)")
                    .param("p", projectId).param("m", gallery.get(i)).param("o", (i + 1) * 10).update();
        }
        for (UUID area : areas) {
            jdbc.sql("insert into expertise_area_project (area_id, project_id) values (:a, :p)")
                    .param("a", area).param("p", projectId).update();
        }
    }

    /** True when no other project uses `slug` in `locale`. */
    public boolean slugAvailable(String locale, String slug, UUID excludeId) {
        return !jdbc.sql("""
                        select exists (select 1 from project_translation
                                       where locale = :locale and slug = :slug
                                         and (cast(:exclude as uuid) is null or project_id <> :exclude))
                        """)
                .param("locale", locale).param("slug", slug).param("exclude", excludeId)
                .query(Boolean.class).single();
    }

    /** Ids from `ids` that exist in `table` (references chosen in the editor). */
    public long countExisting(String table, Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return 0;
        }
        String sql = switch (table) {
            case "technology", "media", "expertise_area" -> "select count(*) from " + table + " where id in (:ids)";
            default -> throw new IllegalArgumentException(table);
        };
        return jdbc.sql(sql).param("ids", ids).query(Long.class).single();
    }

    /** Alt text of a media item in a language, or null. */
    public String altText(UUID mediaId, String locale) {
        return jdbc.sql("select alt_text from media_translation where media_id = :id and locale = :locale")
                .param("id", mediaId).param("locale", locale).query(String.class).optional().orElse(null);
    }

    /** Sets sort_order 10, 20, … in the given order, in one statement. */
    public void reorder(List<UUID> ids) {
        for (int i = 0; i < ids.size(); i++) {
            jdbc.sql("update project set sort_order = :o where id = :id")
                    .param("o", (i + 1) * 10).param("id", ids.get(i)).update();
        }
    }

    public long countByStatus(String status) {
        return jdbc.sql("select count(*) from project where status = :s").param("s", status).query(Long.class).single();
    }
}
