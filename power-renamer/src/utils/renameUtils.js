// Renaming utility functions

/**
 * Apply search and replace rule
 */
export function applySearchReplace(filename, extension, rule, file) {
  const { search, replace, matchCase, includeExtension, useRegex } = rule;
  if (!search) return { name: filename, ext: extension };

  let workingName = includeExtension ? filename + extension : filename;
  let flags = matchCase ? 'g' : 'gi';

  try {
    if (useRegex) {
      const regex = new RegExp(search, flags);
      workingName = workingName.replace(regex, replace || '');
    } else {
      // Simple text replacement
      if (matchCase) {
        workingName = workingName.split(search).join(replace || '');
      } else {
        const regex = new RegExp(escapeRegex(search), flags);
        workingName = workingName.replace(regex, replace || '');
      }
    }
  } catch (e) {
    // Invalid regex, return unchanged
    return { name: filename, ext: extension };
  }

  if (includeExtension) {
    const lastDot = workingName.lastIndexOf('.');
    if (lastDot > 0) {
      return { name: workingName.substring(0, lastDot), ext: workingName.substring(lastDot) };
    }
    return { name: workingName, ext: '' };
  }

  return { name: workingName, ext: extension };
}

/**
 * Apply case conversion
 */
export function applyCaseConversion(filename, extension, rule) {
  const { caseType } = rule;
  let result = filename;

  switch (caseType) {
    case 'upper':
      result = filename.toUpperCase();
      break;
    case 'lower':
      result = filename.toLowerCase();
      break;
    case 'title':
      result = filename.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      break;
    case 'sentence':
      result = filename.charAt(0).toUpperCase() + filename.slice(1).toLowerCase();
      break;
    default:
      break;
  }

  return { name: result, ext: extension };
}

/**
 * Apply enumeration/numbering
 */
export function applyEnumeration(filename, extension, rule, index) {
  const { position, startNumber, padding, separator } = rule;
  const num = (startNumber || 1) + index;
  const paddedNum = String(num).padStart(padding || 3, '0');
  const sep = separator || '_';

  let result;
  if (position === 'prefix') {
    result = paddedNum + sep + filename;
  } else {
    result = filename + sep + paddedNum;
  }

  return { name: result, ext: extension };
}

/**
 * Apply date insertion
 */
export function applyDateVariables(filename, extension, rule, file) {
  const { template, dateSource } = rule;
  if (!template) return { name: filename, ext: extension };

  // Get the date from the file or use current date
  const date = dateSource === 'modified' && file?.lastModified
    ? new Date(file.lastModified)
    : new Date();

  let result = template;
  result = result.replace(/\$YYYY/g, date.getFullYear());
  result = result.replace(/\$YY/g, String(date.getFullYear()).slice(-2));
  result = result.replace(/\$MM/g, String(date.getMonth() + 1).padStart(2, '0'));
  result = result.replace(/\$DD/g, String(date.getDate()).padStart(2, '0'));
  result = result.replace(/\$hh/g, String(date.getHours()).padStart(2, '0'));
  result = result.replace(/\$mm/g, String(date.getMinutes()).padStart(2, '0'));
  result = result.replace(/\$ss/g, String(date.getSeconds()).padStart(2, '0'));
  result = result.replace(/\$MONTH/g, date.toLocaleString('en', { month: 'long' }));
  result = result.replace(/\$Mon/g, date.toLocaleString('en', { month: 'short' }));
  result = result.replace(/\$DAY/g, date.toLocaleString('en', { weekday: 'long' }));
  result = result.replace(/\$Day/g, date.toLocaleString('en', { weekday: 'short' }));
  result = result.replace(/\$NAME/g, filename);

  return { name: result, ext: extension };
}

/**
 * Apply character trimming
 */
export function applyCharacterTrim(filename, extension, rule) {
  const { trimType, trimCount } = rule;
  let result = filename;

  switch (trimType) {
    case 'removeFirst':
      result = filename.slice(trimCount || 0);
      break;
    case 'removeLast':
      result = filename.slice(0, -(trimCount || 0)) || filename;
      break;
    case 'removeDigits':
      result = filename.replace(/\d/g, '');
      break;
    case 'trimWhitespace':
      result = filename.trim().replace(/\s+/g, ' ');
      break;
    case 'removeSpaces':
      result = filename.replace(/\s/g, '');
      break;
    case 'removeSpecial':
      result = filename.replace(/[^a-zA-Z0-9\s]/g, '');
      break;
    default:
      break;
  }

  return { name: result, ext: extension };
}

/**
 * Apply folder name injection
 */
export function applyFolderInjection(filename, extension, rule, folderPath) {
  const { folderLevel, position, separator } = rule;
  
  // Extract folder name from path
  const parts = folderPath.split('/').filter(p => p);
  const levelIndex = parts.length - (folderLevel || 1) - 1;
  const folderName = levelIndex >= 0 ? parts[levelIndex] : '';
  
  if (!folderName) return { name: filename, ext: extension };

  const sep = separator || '_';
  let result;
  
  if (position === 'prefix') {
    result = folderName + sep + filename;
  } else {
    result = filename + sep + folderName;
  }

  return { name: result, ext: extension };
}

/**
 * Apply extension change
 */
export function applyExtensionChange(filename, extension, rule) {
  const { newExtension } = rule;
  if (!newExtension) return { name: filename, ext: extension };
  
  const ext = newExtension.startsWith('.') ? newExtension : '.' + newExtension;
  return { name: filename, ext };
}

/**
 * Apply all rules to a single file
 */
export function applyRules(file, rules, index, folderPath) {
  let filename = file.name;
  let extension = '';
  
  // Separate name and extension
  const lastDot = filename.lastIndexOf('.');
  if (lastDot > 0) {
    extension = filename.substring(lastDot);
    filename = filename.substring(0, lastDot);
  }

  // Apply each rule in order
  for (const rule of rules) {
    if (!rule.enabled) continue;

    let result;
    switch (rule.type) {
      case 'searchReplace':
        result = applySearchReplace(filename, extension, rule, file);
        break;
      case 'caseConversion':
        result = applyCaseConversion(filename, extension, rule);
        break;
      case 'enumeration':
        result = applyEnumeration(filename, extension, rule, index);
        break;
      case 'dateVariables':
        result = applyDateVariables(filename, extension, rule, file);
        break;
      case 'characterTrim':
        result = applyCharacterTrim(filename, extension, rule);
        break;
      case 'folderInjection':
        result = applyFolderInjection(filename, extension, rule, folderPath);
        break;
      case 'extensionChange':
        result = applyExtensionChange(filename, extension, rule);
        break;
      default:
        result = { name: filename, ext: extension };
    }
    
    filename = result.name;
    extension = result.ext;
  }

  return filename + extension;
}

/**
 * Check for naming conflicts
 */
export function detectConflicts(files, renamedFiles) {
  const nameCount = {};
  const conflicts = new Set();

  renamedFiles.forEach((newName, index) => {
    if (!nameCount[newName]) {
      nameCount[newName] = [];
    }
    nameCount[newName].push(index);
  });

  Object.entries(nameCount).forEach(([name, indices]) => {
    if (indices.length > 1) {
      indices.forEach(i => conflicts.add(i));
    }
  });

  return conflicts;
}

/**
 * Escape special regex characters
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Filter files based on criteria
 */
export function filterFiles(files, filter) {
  const { pattern, dateFrom, dateTo, type } = filter;
  
  return files.filter(file => {
    // Pattern matching
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      if (!regex.test(file.name)) return false;
    }
    
    // Date filtering
    if (dateFrom && file.lastModified < new Date(dateFrom).getTime()) {
      return false;
    }
    if (dateTo && file.lastModified > new Date(dateTo).getTime()) {
      return false;
    }
    
    // Type filtering
    if (type && type !== 'all') {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (type === 'images' && !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        return false;
      }
      if (type === 'documents' && !['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
        return false;
      }
      if (type === 'videos' && !['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv'].includes(ext)) {
        return false;
      }
      if (type === 'audio' && !['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Create a default rule
 */
export function createDefaultRule(type) {
  const baseRule = {
    id: Date.now() + Math.random(),
    type,
    enabled: true,
  };

  switch (type) {
    case 'searchReplace':
      return {
        ...baseRule,
        search: '',
        replace: '',
        matchCase: false,
        includeExtension: false,
        useRegex: false,
      };
    case 'caseConversion':
      return {
        ...baseRule,
        caseType: 'lower',
      };
    case 'enumeration':
      return {
        ...baseRule,
        position: 'suffix',
        startNumber: 1,
        padding: 3,
        separator: '_',
      };
    case 'dateVariables':
      return {
        ...baseRule,
        template: '$NAME_$YYYY-$MM-$DD',
        dateSource: 'modified',
      };
    case 'characterTrim':
      return {
        ...baseRule,
        trimType: 'trimWhitespace',
        trimCount: 1,
      };
    case 'folderInjection':
      return {
        ...baseRule,
        folderLevel: 1,
        position: 'prefix',
        separator: '_',
      };
    case 'extensionChange':
      return {
        ...baseRule,
        newExtension: '',
      };
    default:
      return baseRule;
  }
}

/**
 * Get rule display info
 */
export function getRuleDisplayInfo(rule) {
  switch (rule.type) {
    case 'searchReplace':
      return {
        name: 'Search & Replace',
        icon: '🔍',
        description: rule.search ? `"${rule.search}" → "${rule.replace || ''}"` : 'Not configured',
      };
    case 'caseConversion':
      const caseNames = { upper: 'UPPERCASE', lower: 'lowercase', title: 'Title Case', sentence: 'Sentence case' };
      return {
        name: 'Case Conversion',
        icon: 'Aa',
        description: caseNames[rule.caseType] || 'lowercase',
      };
    case 'enumeration':
      return {
        name: 'Numbering',
        icon: '#',
        description: `${rule.position === 'prefix' ? 'Prefix' : 'Suffix'}, start: ${rule.startNumber}, pad: ${rule.padding}`,
      };
    case 'dateVariables':
      return {
        name: 'Date Variables',
        icon: '📅',
        description: rule.template || 'Not configured',
      };
    case 'characterTrim':
      const trimNames = {
        removeFirst: `Remove first ${rule.trimCount} chars`,
        removeLast: `Remove last ${rule.trimCount} chars`,
        removeDigits: 'Remove digits',
        trimWhitespace: 'Trim whitespace',
        removeSpaces: 'Remove spaces',
        removeSpecial: 'Remove special chars',
      };
      return {
        name: 'Character Trim',
        icon: '✂️',
        description: trimNames[rule.trimType] || 'Trim whitespace',
      };
    case 'folderInjection':
      return {
        name: 'Folder Injection',
        icon: '📁',
        description: `Level ${rule.folderLevel}, ${rule.position}`,
      };
    case 'extensionChange':
      return {
        name: 'Change Extension',
        icon: '📄',
        description: rule.newExtension ? `→ .${rule.newExtension.replace('.', '')}` : 'Not configured',
      };
    default:
      return { name: 'Unknown', icon: '?', description: '' };
  }
}
