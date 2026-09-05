// Jest stub for image/media requires. moduleNameMapper intercepts these by
// extension before Jest tries to resolve the real file on disk, so tests
// don't depend on assets/exercises/media/ actually being present (it's
// gitignored — see README.md#exercise-media — and absent in CI).
module.exports = 1;
