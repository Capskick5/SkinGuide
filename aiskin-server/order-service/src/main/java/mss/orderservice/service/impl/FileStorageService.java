package mss.orderservice.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;
import mss.orderservice.service.*;

@Service
public class FileStorageService implements IFileStorageService {

    static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    static final long MAX_IMAGE_PIXELS = 40_000_000L;

    private static final Map<String, String> ALLOWED_TYPES = Map.of("image/jpeg", ".jpg", "image/png", ".png");

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    public String storeEvidenceImage(MultipartFile file) {
        validateBasicMetadata(file);
        String extension = ALLOWED_TYPES.get(file.getContentType());
        Path directory = Path.of(uploadDir).toAbsolutePath().normalize();
        Path target = directory.resolve(UUID.randomUUID() + extension).normalize();
        if (!target.startsWith(directory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }
        try {
            validateImageContent(file);
            Files.createDirectories(directory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/api/orders/uploads/" + target.getFileName();
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image", exception);
        }
    }

    private void validateBasicMetadata(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image must not exceed 5 MB");
        }
        if (!ALLOWED_TYPES.containsKey(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPEG and PNG images are allowed");
        }
    }

    private void validateImageContent(MultipartFile file) throws IOException {
        BufferedImage image;
        try (InputStream input = file.getInputStream()) {
            image = ImageIO.read(input);
        }
        if (image == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File content is not a valid image");
        }
        long pixels = (long) image.getWidth() * image.getHeight();
        if (image.getWidth() < 32 || image.getHeight() < 32 || pixels > MAX_IMAGE_PIXELS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image dimensions are outside the allowed range");
        }
    }
}
