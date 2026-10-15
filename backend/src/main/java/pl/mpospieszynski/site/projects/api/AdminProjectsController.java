package pl.mpospieszynski.site.projects.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.projects.domain.ProjectAdmin;
import pl.mpospieszynski.site.projects.domain.ProjectAdminService;
import pl.mpospieszynski.site.projects.domain.ProjectCatalog;
import pl.mpospieszynski.site.projects.domain.ProjectStatus;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** Admin projects (docs/screens/admin/05-projects-list.md, 06-project-editor.md). ROLE_ADMIN via SecurityConfig. */
@RestController
@RequestMapping("/api/v1/admin/projects")
class AdminProjectsController {

    record ProjectOrderRequest(List<UUID> ids) {
    }

    record ProjectFeaturedRequest(boolean featured, long version) {
    }

    record ProjectSlugAvailability(boolean available) {
    }

    private final ProjectAdminService projects;
    private final ProjectCatalog catalog;

    AdminProjectsController(ProjectAdminService projects, ProjectCatalog catalog) {
        this.projects = projects;
        this.catalog = catalog;
    }

    @Operation(operationId = "listAdminProjects", summary = "All projects incl. drafts, with English status")
    @GetMapping
    List<ProjectAdmin.AdminProjectListItem> list(@RequestParam(required = false) ProjectStatus status) {
        return projects.list(status);
    }

    @Operation(operationId = "createAdminProject", summary = "Create a draft")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProjectAdmin.ProjectSaved create(@RequestBody ProjectAdmin.ProjectInput input) {
        return projects.create(input);
    }

    @Operation(operationId = "getAdminProject")
    @GetMapping("/{id}")
    ProjectAdmin.AdminProject get(@PathVariable UUID id) {
        return projects.get(id);
    }

    @Operation(operationId = "saveAdminProject", summary = "Save; 409 when the version is stale")
    @PutMapping("/{id}")
    ProjectAdmin.ProjectSaved save(@PathVariable UUID id, @RequestBody ProjectAdmin.ProjectInput input) {
        return projects.save(id, input);
    }

    @Operation(operationId = "deleteAdminProject")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        projects.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "setAdminProjectFeatured")
    @PatchMapping("/{id}")
    ProjectAdmin.ProjectSaved featured(@PathVariable UUID id, @RequestBody ProjectFeaturedRequest request) {
        return projects.setFeatured(id, request.version(), request.featured());
    }

    @Operation(operationId = "publishAdminProject", summary = "Publish; 400 listing the missing fields")
    @PostMapping("/{id}/publish")
    ProjectAdmin.ProjectSaved publish(@PathVariable UUID id) {
        return projects.publish(id);
    }

    @Operation(operationId = "unpublishAdminProject")
    @PostMapping("/{id}/unpublish")
    ProjectAdmin.ProjectSaved unpublish(@PathVariable UUID id) {
        return projects.unpublish(id);
    }

    @Operation(operationId = "archiveAdminProject")
    @PostMapping("/{id}/archive")
    ProjectAdmin.ProjectSaved archive(@PathVariable UUID id) {
        return projects.archive(id);
    }

    @Operation(operationId = "reorderAdminProjects")
    @PutMapping("/order")
    ResponseEntity<Void> reorder(@RequestBody ProjectOrderRequest request) {
        projects.reorder(request.ids() == null ? List.of() : request.ids());
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "isAdminProjectSlugAvailable")
    @GetMapping("/slug-available")
    ProjectSlugAvailability slugAvailable(@RequestParam SiteLocale locale, @RequestParam String slug,
                                   @RequestParam(required = false) UUID excludeId) {
        return new ProjectSlugAvailability(projects.slugAvailable(locale.code(), slug, excludeId));
    }

    @Operation(operationId = "previewAdminProject", summary = "The public case study shape, drafts included")
    @GetMapping("/{id}/preview")
    ProjectDetail preview(@PathVariable UUID id, @RequestParam(defaultValue = "pl") SiteLocale lang) {
        return ProjectDetail.from(catalog.preview(lang, id));
    }
}
