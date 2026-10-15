package pl.mpospieszynski.site.media.infra;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.media.domain.Media;

public interface MediaRepository extends JpaRepository<Media, UUID> {

    /** Newest first; `q` matches the file name or an alt text (case-insensitive), empty matches all. */
    @Query(value = """
            select m.* from media m
            where :q = '' or m.original_name ilike '%' || :q || '%'
               or exists (select 1 from media_translation t where t.media_id = m.id and t.alt_text ilike '%' || :q || '%')
            order by m.created_at desc, m.id
            """,
            countQuery = """
            select count(*) from media m
            where :q = '' or m.original_name ilike '%' || :q || '%'
               or exists (select 1 from media_translation t where t.media_id = m.id and t.alt_text ilike '%' || :q || '%')
            """,
            nativeQuery = true)
    Page<Media> search(String q, Pageable pageable);
}
