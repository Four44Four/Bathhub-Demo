-- Run this in the Supabase SQL editor to create the test_table schema.

-- 1. Create a function that updates the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the table
CREATE TABLE test_table (
    id SERIAL PRIMARY KEY,

    -- foo: integer restricted from 0 to 255
    foo INT CHECK (foo >= 0 AND foo <= 255),

    -- description: text with a max length of 1250 characters
    description TEXT CHECK (char_length(description) <= 1250),

    -- created_at: set on creation, cannot be easily updated via standard app logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- updated_at: handled by the trigger on creation and update
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create a trigger to automatically update the 'updated_at' column
CREATE TRIGGER update_test_table_modtime
    BEFORE UPDATE ON test_table
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 4. Create a trigger to prevent 'created_at' from being updated
CREATE OR REPLACE FUNCTION protect_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'The created_at column cannot be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_immutable_created_at_test_table
    BEFORE UPDATE ON test_table
    FOR EACH ROW
    EXECUTE FUNCTION protect_created_at();
