#!/usr/bin/env python3
"""
Update group values in the filtered CSV to match the new mapping.
"""

import csv
import sys

def update_group_values(input_file, output_file):
    """
    Update group values to match the new type1GroupMap.
    """

    # New group mapping
    group_mapping = {
        'Arts': 'Entertainment',
        'Theatre': 'Entertainment',
        'Comedy': 'Entertainment',
        'Film and Cinema': 'Entertainment',
        'Festival': 'Entertainment',
        'Music': 'Entertainment',
        'Culture': 'Entertainment',

        'Government': 'Government',
        'Local Authority': 'Government',
        'Parliament': 'Government',
        'Executive NDPB': 'Government',
        'Agency': 'Government',
        'Public Corporations': 'Government',
        'Politics': 'Government',
        'Law': 'Government',
        'Support': 'Government',
        'Utilities': 'Government',
        'Transport': 'Government',
        'Community': 'Government',

        'Health': 'Education',
        'Health and Social Care': 'Education',
        'Education': 'Education',
        'School': 'Education',
        'School, Primary': 'Education',
        'School, Secondary': 'Education',
        'School, ASL': 'Education',
        'School, Independent': 'Education',
        'Libraries and Archives': 'Education',
        'Research': 'Education',
        'Science': 'Education',
        'Think Tank': 'Education',
        'History': 'Education',
        'Heritage': 'Education',

        'Sports': 'Media',
        'News': 'Media',
        'Media': 'Media',
        'Blog': 'Media',
        'Heritage and Tourism': 'Media'
    }

    print(f"Updating group values in {input_file}...")

    try:
        updated_count = 0

        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            fieldnames = reader.fieldnames

            with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=fieldnames)
                writer.writeheader()

                for row in reader:
                    type1 = row.get('type1', '').strip()
                    new_group = group_mapping.get(type1, 'Other')

                    if row.get('group') != new_group:
                        row['group'] = new_group
                        updated_count += 1

                    writer.writerow(row)

        print(f"Updated {updated_count} group values")
        print(f"Updated data saved to {output_file}")
        return True

    except Exception as e:
        print(f"Error updating groups: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python update_groups.py <input_file> <output_file>")
        print("Example: python update_groups.py filtered_final_data.csv updated_final_data.csv")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    success = update_group_values(input_file, output_file)

    if success:
        print("✅ Group values updated successfully!")
    else:
        print("❌ Group update failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
