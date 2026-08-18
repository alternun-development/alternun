-- The prior AIRS RPC cleanup removes legacy UUID overloads. PostgREST keeps a
-- schema cache, so it can otherwise continue trying to invoke the removed
-- UUID signature instead of the canonical text-user-id RPC.
--
-- Reloading the cache preserves the single text signature without restoring
-- an ambiguous overload.
notify pgrst, 'reload schema';
