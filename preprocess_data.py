#!/usr/bin/env python3
"""
Preprocessing script for Corona Visualization data
Takes data.csv as input and outputs filtered/processed data to final_data.csv
"""

import csv
import random
from datetime import datetime
import sys

# Type1 to Group mapping (from scripts.js)
TYPE1_GROUP_MAP = {
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
    'Charity': 'Government',
    'Church and religion': 'Government',

    'Health': 'Knowledge',
    'Health and Social Care': 'Knowledge',
    'Education': 'Knowledge',
    'School': 'Knowledge',
    'School, Primary': 'Knowledge',
    'School, Secondary': 'Knowledge',
    'School, ASL': 'Knowledge',
    'School, Independent': 'Knowledge',
    'Libraries and Archives': 'Knowledge',
    'Research': 'Knowledge',
    'Science': 'Knowledge',
    'Think Tank': 'Knowledge',
    'History': 'Knowledge',
    'Heritage': 'Knowledge',

    'Sports': 'Media',
    'News': 'Media',
    'Media': 'Media',
    'Blog': 'Media',
    'Heritage and Tourism': 'Media',
    'Business': 'Media',
    'Retail': 'Media',
    'Food and Drink': 'Media',
    'Oil': 'Media',
    'Timber': 'Media',
    'Voluntary': 'Media',
    'Nature': 'Media',
    'Wildlife': 'Media',
    'Religion': 'Media'
}

def process_keywords(keywords_string):
    """Process keywords string into comma-separated lowercase keywords"""
    if not keywords_string:
        return ""

    keywords = [k.strip().lower() for k in keywords_string.split(',')]
    keywords = [k for k in keywords if k]  # Remove empty strings
    return ','.join(keywords)


def main():
    input_file = 'data.csv'
    output_file = 'final_data.csv'

    print(f"Reading data from {input_file}...")

    # Read the CSV file
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        raw_data = list(reader)

    print(f"Total raw records: {len(raw_data)}")

    # Step 1: Filter records where type2 contains 'corona' (case-insensitive)
    # and exclude records with specific URL
    filtered_data = []
    excluded_url = 'https://www.west-dunbarton.gov.uk/council/newsroom/news/'
    excluded_count = 0

    for row in raw_data:
        type2 = row.get('type2', '')
        url = row.get('url', '')

        # Skip if URL matches the excluded URL
        if url == excluded_url:
            excluded_count += 1
            continue

        if type2 and isinstance(type2, str) and 'corona' in type2.lower():
            filtered_data.append(row)

    print(f"Excluded records with URL '{excluded_url}': {excluded_count}")
    print(f"Filtered coronavirus records: {len(filtered_data)}")

    # Step 2: Filter out records with dates before January 1st, 2019
    cutoff_date = datetime(2019, 1, 1)
    date_filtered_data = []
    excluded_by_date = 0

    for row in filtered_data:
        date_string = row.get('first_date_parsed', '')
        parsed_date = None

        if date_string:
            try:
                # Try ISO format (yyyy-mm-dd)
                parsed_date = datetime.strptime(date_string, '%Y-%m-%d')
            except ValueError:
                try:
                    # Try dd/mm/yyyy format
                    parts = date_string.replace('/', '-').split('-')
                    if len(parts) == 3:
                        if len(parts[0]) == 4:  # yyyy-mm-dd
                            parsed_date = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                        else:  # dd-mm-yyyy
                            parsed_date = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
                except (ValueError, IndexError):
                    pass  # Skip invalid dates

        if parsed_date and parsed_date < cutoff_date:
            excluded_by_date += 1
            continue

        date_filtered_data.append(row)

    print(f"Excluded records with dates before 2019-01-01: {excluded_by_date}")
    print(f"Remaining records after date filter: {len(date_filtered_data)}")

    # Step 3: Filter out records without keywords
    keyword_filtered_data = []
    excluded_by_keywords = 0

    for row in date_filtered_data:
        keywords_raw = row.get('first_keywords_auto', '')
        keywords_processed = process_keywords(keywords_raw)

        # Check if there are any keywords after processing
        if not keywords_processed or not keywords_processed.strip():
            excluded_by_keywords += 1
            continue

        keyword_filtered_data.append(row)

    print(f"Excluded records without keywords: {excluded_by_keywords}")
    print(f"Remaining records after keyword filter: {len(keyword_filtered_data)}")

    filtered_data = keyword_filtered_data

    # Step 4: Process each row
    processed_data = []

    for idx, row in enumerate(filtered_data):
        # Keep the date as-is from the original data
        # No date parsing or modification

        # Handle ID - generate if missing
        row_id = row.get('id', '').strip()
        if not row_id or row_id == 'missing':
            row['id'] = f"gen_{idx}_{int(datetime.now().timestamp())}_{random.randint(10000, 99999)}"

        # Process keywords
        keywords_raw = row.get('first_keywords_auto', '')
        row['keywords_processed'] = process_keywords(keywords_raw)

        # Replace 'Scottish Government and Parliament' with 'Parliament' in type1
        type1 = row.get('type1', '')
        if type1 == 'Scottish Government and Parliament':
            row['type1'] = 'Parliament'
            type1 = 'Parliament'

        # Map type1 to group
        row['group'] = TYPE1_GROUP_MAP.get(type1, 'Other')

        processed_data.append(row)

    # Step 5: Filter out records where group='Other'
    group_filtered_data = []
    excluded_by_group = 0

    for row in processed_data:
        if row['group'] == 'Other':
            excluded_by_group += 1
            continue
        group_filtered_data.append(row)

    print(f"Excluded records with group='Other': {excluded_by_group}")
    print(f"Remaining records after group filter: {len(group_filtered_data)}")

    processed_data = group_filtered_data

    # Step 6: Write to output file
    if processed_data:
        # Get all unique fieldnames (original + new fields)
        fieldnames = list(processed_data[0].keys())

        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(processed_data)

        print(f"\n✅ Successfully processed {len(processed_data)} records")
        print(f"✅ Output written to {output_file}")
        print(f"\nNew fields added:")
        print(f"  - keywords_processed: Processed keywords (lowercase, comma-separated)")
        print(f"  - group: Group category based on type1")
    else:
        print("❌ No data to write!")
        sys.exit(1)


if __name__ == '__main__':
    main()

