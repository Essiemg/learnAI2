#!/usr/bin/env python3
"""
Dataset Refinement Script for Phi-3 Fine-Tuning
================================================
Scans JSONL dataset and removes internal 'thought', 'reasoning', 
'internal' blocks from assistant/output fields.

Usage:
    python clean_dataset.py input.jsonl output.jsonl [--dry-run] [--verbose]
"""

import json
import re
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


# Patterns to remove from assistant outputs
THOUGHT_PATTERNS = [
    # XML-style tags
    r'<thought>.*?</thought>',
    r'<thinking>.*?</thinking>',
    r'<reasoning>.*?</reasoning>',
    r'<internal>.*?</internal>',
    r'<scratchpad>.*?</scratchpad>',
    r'<reflection>.*?</reflection>',
    r'<analysis>.*?</analysis>',
    r'<planning>.*?</planning>',
    r'<step>.*?</step>',
    r'<chain-of-thought>.*?</chain-of-thought>',
    r'<cot>.*?</cot>',
    
    # Markdown-style blocks
    r'\*\*Thought:\*\*.*?(?=\n\n|\*\*Response|\*\*Answer|$)',
    r'\*\*Thinking:\*\*.*?(?=\n\n|\*\*Response|\*\*Answer|$)',
    r'\*\*Reasoning:\*\*.*?(?=\n\n|\*\*Response|\*\*Answer|$)',
    r'\*\*Internal:\*\*.*?(?=\n\n|\*\*Response|\*\*Answer|$)',
    
    # Prefix-style patterns (line-based)
    r'^Thought:.*$',
    r'^Thinking:.*$', 
    r'^Reasoning:.*$',
    r'^Internal:.*$',
    r'^Step \d+:.*$',
    r'^Let me think.*$',
    r'^I need to consider.*$',
    r'^First, I should.*$',
    r'^My reasoning:.*$',
    
    # Bracketed patterns
    r'\[Thought\].*?\[/Thought\]',
    r'\[Internal\].*?\[/Internal\]',
    r'\[Reasoning\].*?\[/Reasoning\]',
    r'\[Analysis\].*?\[/Analysis\]',
    
    # Common CoT patterns
    r'(?:^|\n)---\s*Internal Monologue\s*---.*?(?:---\s*Response\s*---|$)',
    r'(?:^|\n)###\s*Thought Process\s*###.*?(?:###\s*Answer\s*###|$)',
]

# Fields that contain assistant responses
ASSISTANT_FIELDS = ['assistant', 'output', 'response', 'completion', 'answer', 'text']
MESSAGE_ROLE_FIELDS = ['role', 'from', 'speaker']


def compile_patterns() -> List[re.Pattern]:
    """Compile all regex patterns for efficiency."""
    compiled = []
    for pattern in THOUGHT_PATTERNS:
        try:
            compiled.append(re.compile(pattern, re.DOTALL | re.MULTILINE | re.IGNORECASE))
        except re.error as e:
            logger.warning(f"Invalid pattern '{pattern}': {e}")
    return compiled


def clean_text(text: str, patterns: List[re.Pattern], verbose: bool = False) -> Tuple[str, int]:
    """
    Remove thought/reasoning patterns from text.
    
    Returns:
        Tuple of (cleaned_text, number_of_removals)
    """
    if not isinstance(text, str):
        return text, 0
    
    original = text
    removals = 0
    
    for pattern in patterns:
        matches = pattern.findall(text)
        if matches:
            removals += len(matches)
            if verbose:
                for match in matches:
                    preview = match[:100] + "..." if len(match) > 100 else match
                    logger.debug(f"Removing: {preview}")
            text = pattern.sub('', text)
    
    # Clean up extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines
    text = re.sub(r'  +', ' ', text)  # Max 1 space
    text = text.strip()
    
    return text, removals


def clean_messages(messages: List[Dict], patterns: List[re.Pattern], verbose: bool = False) -> Tuple[List[Dict], int]:
    """Clean assistant messages in a conversation format."""
    total_removals = 0
    cleaned_messages = []
    
    for msg in messages:
        new_msg = msg.copy()
        
        # Check if this is an assistant message
        role = None
        for field in MESSAGE_ROLE_FIELDS:
            if field in msg:
                role = msg[field].lower()
                break
        
        if role in ['assistant', 'gpt', 'model', 'bot', 'ai']:
            # Find and clean the content field
            for content_field in ['content', 'text', 'value', 'message']:
                if content_field in msg:
                    cleaned, removals = clean_text(msg[content_field], patterns, verbose)
                    new_msg[content_field] = cleaned
                    total_removals += removals
                    break
        
        cleaned_messages.append(new_msg)
    
    return cleaned_messages, total_removals


def clean_entry(entry: Dict[str, Any], patterns: List[re.Pattern], verbose: bool = False) -> Tuple[Dict, int]:
    """Clean a single JSONL entry."""
    cleaned = entry.copy()
    total_removals = 0
    
    # Handle conversation format (messages array)
    if 'messages' in entry and isinstance(entry['messages'], list):
        cleaned['messages'], removals = clean_messages(entry['messages'], patterns, verbose)
        total_removals += removals
    
    # Handle conversation format (conversations array - Alpaca style)
    if 'conversations' in entry and isinstance(entry['conversations'], list):
        cleaned['conversations'], removals = clean_messages(entry['conversations'], patterns, verbose)
        total_removals += removals
    
    # Handle flat format (direct assistant/output fields)
    for field in ASSISTANT_FIELDS:
        if field in entry and isinstance(entry[field], str):
            cleaned[field], removals = clean_text(entry[field], patterns, verbose)
            total_removals += removals
    
    # Handle instruction-input-output format
    if 'instruction' in entry and 'output' in entry:
        cleaned['output'], removals = clean_text(entry['output'], patterns, verbose)
        total_removals += removals
    
    return cleaned, total_removals


def process_dataset(
    input_path: Path,
    output_path: Path,
    dry_run: bool = False,
    verbose: bool = False
) -> Dict[str, int]:
    """
    Process entire JSONL dataset.
    
    Returns:
        Statistics dictionary
    """
    patterns = compile_patterns()
    stats = {
        'total_entries': 0,
        'entries_modified': 0,
        'total_removals': 0,
        'errors': 0
    }
    
    cleaned_entries = []
    
    logger.info(f"Processing: {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            stats['total_entries'] += 1
            
            try:
                entry = json.loads(line)
                cleaned, removals = clean_entry(entry, patterns, verbose)
                
                if removals > 0:
                    stats['entries_modified'] += 1
                    stats['total_removals'] += removals
                    if verbose:
                        logger.info(f"Line {line_num}: Removed {removals} pattern(s)")
                
                cleaned_entries.append(cleaned)
                
            except json.JSONDecodeError as e:
                stats['errors'] += 1
                logger.error(f"Line {line_num}: JSON parse error - {e}")
                cleaned_entries.append(None)  # Keep position for debugging
    
    # Write output
    if not dry_run:
        with open(output_path, 'w', encoding='utf-8') as f:
            for entry in cleaned_entries:
                if entry is not None:
                    f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        logger.info(f"Output written to: {output_path}")
    else:
        logger.info("DRY RUN - No files written")
    
    return stats


def validate_dataset(path: Path) -> List[Dict]:
    """Validate cleaned dataset for common issues."""
    issues = []
    
    with open(path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                entry = json.loads(line)
                
                # Check for empty assistant responses
                for field in ASSISTANT_FIELDS:
                    if field in entry and not entry[field].strip():
                        issues.append({
                            'line': line_num,
                            'issue': f'Empty {field} field after cleaning'
                        })
                
                # Check messages format
                if 'messages' in entry:
                    for i, msg in enumerate(entry['messages']):
                        role = msg.get('role', msg.get('from', ''))
                        content = msg.get('content', msg.get('text', ''))
                        if role.lower() in ['assistant', 'model'] and not content.strip():
                            issues.append({
                                'line': line_num,
                                'issue': f'Empty assistant message at index {i}'
                            })
                            
            except json.JSONDecodeError:
                issues.append({'line': line_num, 'issue': 'Invalid JSON'})
    
    return issues


def main():
    parser = argparse.ArgumentParser(
        description='Clean thought/reasoning patterns from fine-tuning dataset',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python clean_dataset.py train.jsonl train_clean.jsonl
    python clean_dataset.py train.jsonl train_clean.jsonl --dry-run --verbose
    python clean_dataset.py train.jsonl train_clean.jsonl --validate
        """
    )
    parser.add_argument('input', type=Path, help='Input JSONL file')
    parser.add_argument('output', type=Path, help='Output JSONL file')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed progress')
    parser.add_argument('--validate', action='store_true', help='Validate output after cleaning')
    
    args = parser.parse_args()
    
    if not args.input.exists():
        logger.error(f"Input file not found: {args.input}")
        return 1
    
    # Process dataset
    stats = process_dataset(
        args.input,
        args.output,
        dry_run=args.dry_run,
        verbose=args.verbose
    )
    
    # Print statistics
    print("\n" + "=" * 50)
    print("DATASET CLEANING SUMMARY")
    print("=" * 50)
    print(f"Total entries processed: {stats['total_entries']}")
    print(f"Entries modified:        {stats['entries_modified']}")
    print(f"Total patterns removed:  {stats['total_removals']}")
    print(f"Parse errors:            {stats['errors']}")
    print("=" * 50)
    
    # Validate if requested
    if args.validate and not args.dry_run and args.output.exists():
        print("\nValidating cleaned dataset...")
        issues = validate_dataset(args.output)
        if issues:
            print(f"Found {len(issues)} potential issues:")
            for issue in issues[:10]:  # Show first 10
                print(f"  Line {issue['line']}: {issue['issue']}")
            if len(issues) > 10:
                print(f"  ... and {len(issues) - 10} more")
        else:
            print("✓ No issues found")
    
    return 0


if __name__ == '__main__':
    exit(main())
