// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Embedded skin profile (1-1 with User), per physical_erd.md.
 * Stored inline inside the users document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkinProfile {

    /** normal | oily | dry | combination | sensitive | null */
    private String skinType;

    /** e.g. ["acne", "dark_spots", "wrinkles"] */
    @Builder.Default
    private List<String> currentConcerns = new ArrayList<>();

    /** e.g. ["fragrance", "alcohol", "parabens"] */
    @Builder.Default
    private List<String> allergies = new ArrayList<>();

    @Builder.Default
    private boolean sensitiveSkin = false;

    /** male | female | other | null */
    private String gender;
}
