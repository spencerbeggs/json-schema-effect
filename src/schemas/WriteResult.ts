/**
 * Outcome of a file write operation, tagged with whether content changed.
 *
 * @public
 */
export type WriteResult =
	| { readonly _tag: "Written"; readonly path: string }
	| { readonly _tag: "Unchanged"; readonly path: string };

/**
 * Builds a {@link WriteResult} indicating the file at `path` was written.
 *
 * @param path - the file path that was written
 * @public
 */
export const Written = (path: string): WriteResult => ({
	_tag: "Written",
	path,
});

/**
 * Builds a {@link WriteResult} indicating the file at `path` was already
 * up to date and left unchanged.
 *
 * @param path - the file path that was left unchanged
 * @public
 */
export const Unchanged = (path: string): WriteResult => ({
	_tag: "Unchanged",
	path,
});
