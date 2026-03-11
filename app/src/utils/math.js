/**
 * math.js — Fitness Math Utilities
 */

/**
 * Calculates Estimated 1-Rep Max using the Epley formula.
 * Formula: Weight × (1 + (Reps / 30))
 * 
 * @param {number} kg Weight lifted
 * @param {number} reps Reps performed
 * @returns {number} Estimated 1RM
 */
export function calculateE1RM(kg, reps) {
    if (!kg || !reps || reps <= 0) return 0
    return kg * (1 + (reps / 30))
}

/**
 * Calculates a target working weight based on a percentage of 1RM,
 * snapped to the nearest valid plate increment (e.g. 2.5kg).
 * 
 * @param {number} e1rm Estimated 1RM in kg
 * @param {number} percentage Target percentage (e.g. 0.85 for 85%)
 * @param {number} increment Plate increment to snap to (default 2.5kg)
 * @returns {number} Snapped target weight
 */
export function calculateTargetWeight(e1rm, percentage = 0.85, increment = 2.5) {
    if (!e1rm) return 0
    const rawTarget = e1rm * percentage
    // Snap to nearest increment (e.g. 102.3 -> 102.5, 101.1 -> 100)
    return Math.round(rawTarget / increment) * increment
}
