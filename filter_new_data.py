#!/usr/bin/env python3
"""
Filter the new CSV data to remove unwanted categories and URLs.
"""

import csv
import sys
from datetime import datetime

def filter_new_csv_data(input_file, output_file):
    """
    Filter CSV data to remove unwanted categories and URLs.
    """

    # Categories to exclude
    excluded_categories = {
        'Business',
        'Retail',
        'Food and Drink',
        'Oil',
        'Timber',
        'Voluntary',
        'Charity',
        'Nature',
        'Wildlife',
        'Church and religion',
        'Religion'
    }

    # URL pattern to exclude
    excluded_url_pattern = "https://www.west-dunbarton.gov.uk/council/newsroom/news/"

    # Date filter - only include data from January 2019 onwards
    min_date = datetime(2019, 1, 1)

    # Group mapping
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

    print(f"Reading data from {input_file}...")

    try:
        # Read and filter the CSV
        original_count = 0
        filtered_count = 0
        category_counts = {}
        covid_yes_count = 0
        date_filtered_count = 0

        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            fieldnames = list(reader.fieldnames) + ['group']  # Add group field

            with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=fieldnames)
                writer.writeheader()

                for row in reader:
                    original_count += 1
                    type1 = row.get('type1', '').strip()
                    url = row.get('url', '').strip()
                    covid_field = row.get('COVID (add yes/ no)', '').strip().lower()
                    first_date_str = row.get('first_date_parsed', '').strip()

                    # Parse and filter by date
                    try:
                        if first_date_str:
                            # Try different date formats
                            first_date = None
                            for date_format in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                                try:
                                    first_date = datetime.strptime(first_date_str, date_format)
                                    break
                                except ValueError:
                                    continue

                            if first_date is None or first_date < min_date:
                                date_filtered_count += 1
                                continue
                    except:
                        # If date parsing fails, skip this record
                        date_filtered_count += 1
                        continue

                    # Skip excluded categories
                    if type1 in excluded_categories:
                        continue

                    # Skip excluded URL pattern
                    if url.startswith(excluded_url_pattern):
                        continue

                    # Skip if not in valid categories
                    if type1 not in group_mapping:
                        continue

                    # Update group value
                    row['group'] = group_mapping[type1]

                    # Count COVID yes
                    if covid_field == 'yes':
                        covid_yes_count += 1

                    writer.writerow(row)
                    filtered_count += 1
                    category_counts[type1] = category_counts.get(type1, 0) + 1

        excluded_count = original_count - filtered_count
        print(f"Original records: {original_count}")
        print(f"Excluded {date_filtered_count} records (before January 2019)")
        print(f"Excluded {excluded_count - date_filtered_count} records (unwanted categories or URLs)")
        print(f"Final records: {filtered_count}")
        print(f"COVID=yes records: {covid_yes_count}")

        # Show category distribution
        print("\nCategory distribution:")
        for category, count in sorted(category_counts.items()):
            print(f"  {category}: {count}")

        print(f"\nFiltered data saved to {output_file}")
        return True

    except Exception as e:
        print(f"Error processing data: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python filter_new_data.py <input_file> <output_file>")
        print("Example: python filter_new_data.py SIN-new-dorsey_COVID_updated.csv final_covid_data.csv")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    success = filter_new_csv_data(input_file, output_file)

    if success:
        print("✅ Data filtering completed successfully!")
    else:
        print("❌ Data filtering failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
