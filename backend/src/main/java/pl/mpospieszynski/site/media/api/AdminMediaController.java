package pl.mpospieszynski.site.media.api;

import io.swagger.v3.oas.annotations.Operation;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pl.mpospieszynski.site.media.domain.MediaAdmin.AdminMedia;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaInput;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaPage;
import pl.mpospieszynski.site.media.domain.MediaAdmin.MediaUsage;
import pl.mpospieszynski.site.media.domain.MediaAdminService;

/** Admin media library and picker (docs/screens/admin/09-media.md). */
@RestController
@RequestMapping("/api/v1/admin/media")
class AdminMediaController {

    private final MediaAdminService media;

    AdminMediaController(MediaAdminService media) {
        this.media = media;
    }

    @Operation(operationId = "listAdminMedia", summary = "Newest first; q searches file names and alt texts")
    @GetMapping
    MediaPage list(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page,
                   @RequestParam(defaultValue = "48") int size) {
        return media.list(q, page, size);
    }

    @Operation(operationId = "getAdminMedia")
    @GetMapping("/{id}")
    AdminMedia get(@PathVariable UUID id) {
        return media.get(id);
    }

    @Operation(operationId = "uploadAdminMedia", summary = "JPG, PNG or WebP up to 5 MB")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    AdminMedia upload(@RequestPart("file") MultipartFile file) {
        try {
            return media.upload(file.getBytes(), file.getOriginalFilename());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Operation(operationId = "saveAdminMedia", summary = "Alt texts and captions")
    @PutMapping("/{id}")
    AdminMedia save(@PathVariable UUID id, @RequestBody MediaInput input) {
        return media.save(id, input);
    }

    @Operation(operationId = "listAdminMediaUsages")
    @GetMapping("/{id}/usages")
    List<MediaUsage> usages(@PathVariable UUID id) {
        return media.usages(id);
    }

    @Operation(operationId = "deleteAdminMedia", summary = "409 while the file is used")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        media.delete(id);
        return ResponseEntity.noContent().build();
    }
}
