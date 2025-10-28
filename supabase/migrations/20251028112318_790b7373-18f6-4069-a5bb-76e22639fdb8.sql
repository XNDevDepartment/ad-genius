-- Allow users to delete their own outfit swap results
CREATE POLICY "Users can delete their own outfit swap results"
ON outfit_swap_results
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);