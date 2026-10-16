<?php

/**
 * Inertia resolves pages with `import.meta.glob('./pages/**\/*.tsx')`. Test
 * files live next to the pages (`pages/**\/__tests__`), so the glob must
 * exclude them: otherwise every test file is shipped in the production bundle
 * and Vite can drop a page that a test imports (as happened to
 * `products/create.tsx`, which then answered 500 "Unable to locate file in
 * Vite manifest").
 */
it('keeps frontend test files out of the Inertia page glob', function (string $entry) {
    $source = file_get_contents(base_path($entry));

    expect($source)->toContain("'!./pages/**/__tests__/**'");
})->with(['resources/js/app.tsx', 'resources/js/ssr.tsx']);
