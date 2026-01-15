import { useState } from 'react';

const RULE_TYPES = [
    {
        type: 'searchReplace',
        icon: '🔍',
        label: 'Find & Replace',
        description: 'Search for text and replace it'
    },
    {
        type: 'caseConversion',
        icon: 'Aa',
        label: 'Change Case',
        description: 'Convert to upper, lower, or title case'
    },
    {
        type: 'enumeration',
        icon: '123',
        label: 'Add Numbers',
        description: 'Add sequential numbers to filenames'
    },
    {
        type: 'dateVariables',
        icon: '📅',
        label: 'Insert Date',
        description: 'Add date/time to filenames'
    },
    {
        type: 'characterTrim',
        icon: '✂️',
        label: 'Remove Characters',
        description: 'Trim or remove specific characters'
    },
    {
        type: 'folderInjection',
        icon: '📁',
        label: 'Add Folder Name',
        description: 'Insert parent folder name'
    },
    {
        type: 'extensionChange',
        icon: '📄',
        label: 'Change Extension',
        description: 'Modify file extension'
    },
];

const DATE_VARIABLES = [
    { var: '$YYYY', desc: 'Year (4d)' },
    { var: '$YY', desc: 'Year (2d)' },
    { var: '$MM', desc: 'Month' },
    { var: '$DD', desc: 'Day' },
    { var: '$hh', desc: 'Hour' },
    { var: '$mm', desc: 'Min' },
    { var: '$NAME', desc: 'Name' },
];

function RuleEditor({ rule, onSave, onCancel, isNew }) {
    const [editedRule, setEditedRule] = useState({ ...rule });

    const handleTypeChange = (type) => {
        setEditedRule(prev => ({
            ...prev,
            type,
            // Reset type-specific fields
            ...(type === 'searchReplace' && { search: '', replace: '', matchCase: false, includeExtension: false, useRegex: false }),
            ...(type === 'caseConversion' && { caseType: 'lower' }),
            ...(type === 'enumeration' && { position: 'suffix', startNumber: 1, padding: 3, separator: '_' }),
            ...(type === 'dateVariables' && { template: '$NAME_$YYYY-$MM-$DD', dateSource: 'modified' }),
            ...(type === 'characterTrim' && { trimType: 'trimWhitespace', trimCount: 1 }),
            ...(type === 'folderInjection' && { folderLevel: 1, position: 'prefix', separator: '_' }),
            ...(type === 'extensionChange' && { newExtension: '' }),
        }));
    };

    const updateField = (field, value) => {
        setEditedRule(prev => ({ ...prev, [field]: value }));
    };

    const insertVariable = (variable) => {
        const input = document.getElementById('template-input');
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newValue = editedRule.template.substring(0, start) + variable + editedRule.template.substring(end);
            updateField('template', newValue);
        } else {
            updateField('template', (editedRule.template || '') + variable);
        }
    };

    const renderRuleConfig = () => {
        switch (editedRule.type) {
            case 'searchReplace':
                return (
                    <div className="rule-config-section">
                        <div className="form-group">
                            <label htmlFor="search">Search for</label>
                            <input
                                id="search"
                                type="text"
                                value={editedRule.search || ''}
                                onChange={(e) => updateField('search', e.target.value)}
                                placeholder="Text to find..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="replace">Replace with</label>
                            <input
                                id="replace"
                                type="text"
                                value={editedRule.replace || ''}
                                onChange={(e) => updateField('replace', e.target.value)}
                                placeholder="Replacement text..."
                            />
                        </div>
                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={editedRule.matchCase || false}
                                    onChange={(e) => updateField('matchCase', e.target.checked)}
                                />
                                <span>Match Case</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={editedRule.includeExtension || false}
                                    onChange={(e) => updateField('includeExtension', e.target.checked)}
                                />
                                <span>Include Ext</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={editedRule.useRegex || false}
                                    onChange={(e) => updateField('useRegex', e.target.checked)}
                                />
                                <span>Regex Mode</span>
                            </label>
                        </div>
                    </div>
                );

            case 'caseConversion':
                return (
                    <div className="case-options-grid">
                        {[
                            { value: 'upper', label: 'UPPERCASE', ex: 'MY_FILE' },
                            { value: 'lower', label: 'lowercase', ex: 'my_file' },
                            { value: 'title', label: 'Title Case', ex: 'My_File' },
                            { value: 'sentence', label: 'Sentence case', ex: 'My_file' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                className={`case-option-btn ${editedRule.caseType === opt.value ? 'active' : ''}`}
                                onClick={() => updateField('caseType', opt.value)}
                            >
                                <span className="case-label">{opt.label}</span>
                                <span className="case-example">{opt.ex}</span>
                            </button>
                        ))}
                    </div>
                );

            case 'enumeration':
                return (
                    <div className="rule-config-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Position</label>
                                <select
                                    value={editedRule.position}
                                    onChange={(e) => updateField('position', e.target.value)}
                                >
                                    <option value="prefix">Prefix (001_file)</option>
                                    <option value="suffix">Suffix (file_001)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Separator</label>
                                <input
                                    type="text"
                                    value={editedRule.separator || ''}
                                    onChange={(e) => updateField('separator', e.target.value)}
                                    maxLength={5}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Number</label>
                                <input
                                    type="number"
                                    value={editedRule.startNumber}
                                    onChange={(e) => updateField('startNumber', parseInt(e.target.value) || 1)}
                                    min={0}
                                />
                            </div>
                            <div className="form-group">
                                <label>Padding</label>
                                <input
                                    type="number"
                                    value={editedRule.padding}
                                    onChange={(e) => updateField('padding', parseInt(e.target.value) || 1)}
                                    min={1}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'dateVariables':
                return (
                    <div className="rule-config-section">
                        <div className="form-group">
                            <label htmlFor="template-input">Template</label>
                            <input
                                id="template-input"
                                type="text"
                                value={editedRule.template || ''}
                                onChange={(e) => updateField('template', e.target.value)}
                                placeholder="$NAME_$YYYY-$MM-$DD"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date Source</label>
                            <select
                                value={editedRule.dateSource}
                                onChange={(e) => updateField('dateSource', e.target.value)}
                            >
                                <option value="modified">File Modified Date</option>
                                <option value="current">Current Date</option>
                            </select>
                        </div>
                        <div className="variables-panel">
                            <p className="variables-label">Variables</p>
                            <div className="variables-list">
                                {DATE_VARIABLES.map(v => (
                                    <button
                                        key={v.var}
                                        type="button"
                                        className="btn btn-secondary btn-sm variable-btn"
                                        onClick={() => insertVariable(v.var)}
                                        title={v.desc}
                                    >
                                        {v.var}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'characterTrim':
                return (
                    <div className="rule-config-section">
                        <div className="form-group">
                            <label>Operation</label>
                            <select
                                value={editedRule.trimType}
                                onChange={(e) => updateField('trimType', e.target.value)}
                            >
                                <option value="removeFirst">Remove first N chars</option>
                                <option value="removeLast">Remove last N chars</option>
                                <option value="removeDigits">Remove all digits</option>
                                <option value="trimWhitespace">Trim whitespace</option>
                                <option value="removeSpaces">Remove all spaces</option>
                                <option value="removeSpecial">Remove special chars</option>
                            </select>
                        </div>
                        {['removeFirst', 'removeLast'].includes(editedRule.trimType) && (
                            <div className="form-group">
                                <label>Number of characters</label>
                                <input
                                    type="number"
                                    value={editedRule.trimCount}
                                    onChange={(e) => updateField('trimCount', parseInt(e.target.value) || 1)}
                                    min={1}
                                />
                            </div>
                        )}
                    </div>
                );

            case 'folderInjection':
                return (
                    <div className="rule-config-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Level</label>
                                <select
                                    value={String(editedRule.folderLevel)}
                                    onChange={(e) => updateField('folderLevel', parseInt(e.target.value))}
                                >
                                    <option value="1">Parent</option>
                                    <option value="2">Grandparent</option>
                                    <option value="3">G-Grandparent</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Position</label>
                                <select
                                    value={editedRule.position}
                                    onChange={(e) => updateField('position', e.target.value)}
                                >
                                    <option value="prefix">Prefix</option>
                                    <option value="suffix">Suffix</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Separator</label>
                            <input
                                type="text"
                                value={editedRule.separator || ''}
                                onChange={(e) => updateField('separator', e.target.value)}
                                maxLength={5}
                            />
                        </div>
                    </div>
                );

            case 'extensionChange':
                return (
                    <div className="rule-config-section">
                        <div className="form-group">
                            <label>New Extension</label>
                            <input
                                type="text"
                                value={editedRule.newExtension || ''}
                                onChange={(e) => updateField('newExtension', e.target.value)}
                                placeholder="jpg (no dot)"
                            />
                        </div>
                        <p className="helper-text">
                            ℹ️ Note: This handles common media conversions.
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        <span style={{ marginRight: '0.5rem' }}>{isNew ? '➕' : '✏️'}</span>
                        {isNew ? 'Add Rename Rule' : 'Edit Rule'}
                    </h3>
                    <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
                </div>

                <div className="modal-body">
                    {isNew && (
                        <div className="rule-type-grid">
                            {RULE_TYPES.map(rt => (
                                <button
                                    key={rt.type}
                                    type="button"
                                    className={`rule-type-btn ${editedRule.type === rt.type ? 'active' : ''}`}
                                    onClick={() => handleTypeChange(rt.type)}
                                >
                                    <span className="rule-type-icon">{rt.icon}</span>
                                    <span className="rule-type-label">{rt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="rule-config-container">
                        {editedRule.type ? renderRuleConfig() : (
                            <div className="empty-config">
                                Select a rule type above...
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onSave(editedRule)}
                        disabled={!editedRule.type}
                    >
                        {isNew ? 'Add Rule' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RuleEditor;
