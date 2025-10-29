#!/usr/bin/env python3
"""
Filter CSV data to remove unwanted categories before visualization.
"""

import csv
import sys

def filter_csv_data(input_file, output_file):
    """
    Filter CSV data to remove unwanted categories.
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
    
    print(f"Reading data from {input_file}...")
    
    try:
        # Read and filter the CSV
        original_count = 0
        filtered_count = 0
        category_counts = {}
        
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            fieldnames = reader.fieldnames
            
            with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for row in reader:
                    original_count += 1
                    type1 = row.get('type1', '').strip()
                    
                    # Skip excluded categories
                    if type1 in excluded_categories:
                        continue
                    
                    writer.writerow(row)
                    filtered_count += 1
                    category_counts[type1] = category_counts.get(type1, 0) + 1
        
        excluded_count = original_count - filtered_count
        print(f"Original records: {original_count}")
        print(f"Excluded {excluded_count} records with unwanted categories")
        print(f"Final records: {filtered_count}")
        
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
        print("Usage: python filter_data.py <input_file> <output_file>")
        print("Example: python filter_data.py final_data.csv filtered_final_data.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = filter_csv_data(input_file, output_file)
    
    if success:
        print("✅ Data filtering completed successfully!")
    else:
        print("❌ Data filtering failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
