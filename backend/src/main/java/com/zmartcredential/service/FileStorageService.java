package com.zmartcredential.service;

import com.zmartcredential.config.AppProperties;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Stores uploaded files on local disk under app.storage.path.
 * Storage keys are relative paths ("org-1/2026/10/uuid.pdf"); swap this class for S3 etc. later.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "gif", "webp", "tif", "tiff", "doc", "docx", "xls", "xlsx", "csv", "txt", "heic");

    private final Path root;

    public FileStorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.storage().path()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(Long orgId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException("File is empty");
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("File type ." + ext + " is not allowed");
        }
        LocalDate today = LocalDate.now();
        String key = "org-" + (orgId == null ? "none" : orgId) + "/" + today.getYear() + "/"
                + String.format("%02d", today.getMonthValue()) + "/" + UUID.randomUUID() + "." + ext;
        Path target = resolve(key);
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        return key;
    }

    public Resource load(String key) {
        if (key == null) throw new NotFoundException("No file has been uploaded");
        Path path = resolve(key);
        if (!Files.exists(path)) throw new NotFoundException("File not found");
        return new FileSystemResource(path);
    }

    public void delete(String key) {
        if (key == null) return;
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // orphaned files are harmless
        }
    }

    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new BadRequestException("Invalid file key");
        return p;
    }

    private static String extension(String name) {
        if (name == null || !name.contains(".")) return "";
        return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    }
}
