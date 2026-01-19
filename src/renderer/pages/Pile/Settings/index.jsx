import styles from './Settings.module.scss';
import { SettingsIcon, CrossIcon, EditIcon } from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { useHighlightsContext } from 'renderer/context/HighlightsContext';
import AISettingTabs from './AISettingsTabs';
import { useIndexContext } from 'renderer/context/IndexContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLOR_PRESETS = [
  { name: 'Orange', color: '#FF703A' },
  { name: 'Green', color: '#4de64d' },
  { name: 'Blue', color: '#017AFF' },
  { name: 'Red', color: '#FF3B30' },
  { name: 'Purple', color: '#AF52DE' },
  { name: 'Yellow', color: '#FFCC00' },
  { name: 'Pink', color: '#FF2D55' },
  { name: 'Teal', color: '#5AC8FA' },
  { name: 'Gray', color: '#8E8E93' },
];

function SortableHighlightItem({ id, name, data, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.highlightItem} ${isDragging ? styles.dragging : ''}`}
    >
      <button
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
      >
        <span className={styles.dragIcon}>≡</span>
      </button>
      <div
        className={styles.highlightSwatch}
        style={{ backgroundColor: data.color }}
      />
      <span className={styles.highlightName}>{name}</span>
      <div className={styles.highlightActions}>
        <button
          className={styles.highlightActionBtn}
          onClick={() => onEdit(name, data)}
        >
          <EditIcon className={styles.actionIcon} />
        </button>
        <button
          className={styles.highlightActionBtn}
          onClick={() => onDelete(name)}
        >
          <CrossIcon className={styles.actionIcon} />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { regenerateEmbeddings } = useIndexContext();
  const {
    ai,
    prompt,
    setPrompt,
    updateSettings,
    setBaseUrl,
    getKey,
    setKey,
    deleteKey,
    model,
    setModel,
    ollama,
    baseUrl,
  } = useAIContext();
  const [APIkey, setCurrentKey] = useState('');
  const { currentTheme, setTheme } = usePilesContext();
  const {
    highlights,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    reorderHighlights,
  } = useHighlightsContext();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Highlight editor state
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [highlightName, setHighlightName] = useState('');
  const [highlightColor, setHighlightColor] = useState('#FF703A');
  const [customColor, setCustomColor] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const retrieveKey = async () => {
    const k = await getKey();
    setCurrentKey(k);
  };

  useEffect(() => {
    retrieveKey();
  }, []);

  const handleOnChangeBaseUrl = (e) => {
    setBaseUrl(e.target.value);
  };

  const handleOnChangeModel = (e) => {
    setModel(e.target.value);
  };

  const handleOnChangeKey = (e) => {
    setCurrentKey(e.target.value);
  };

  const handleOnChangePrompt = (e) => {
    const p = e.target.value ?? '';
    setPrompt(p);
  };

  const handleSaveChanges = () => {
    if (!APIkey || APIkey == '') {
      deleteKey();
    } else {
      console.log('save key', APIkey);
      setKey(APIkey);
    }

    updateSettings(prompt);
    // regenerateEmbeddings();
  };

  const handleStartAddHighlight = () => {
    setIsAddingNew(true);
    setEditingHighlight(null);
    setHighlightName('');
    setHighlightColor('#FF703A');
    setCustomColor('');
  };

  const handleStartEditHighlight = (name, data) => {
    setIsAddingNew(false);
    setEditingHighlight(name);
    setHighlightName(name);
    setHighlightColor(data.color);
    setCustomColor(data.color);
  };

  const handleCancelEdit = () => {
    setIsAddingNew(false);
    setEditingHighlight(null);
    setHighlightName('');
    setHighlightColor('#FF703A');
    setCustomColor('');
  };

  const handleSaveHighlight = () => {
    if (!highlightName.trim()) return;

    if (isAddingNew) {
      createHighlight({ name: highlightName.trim(), color: highlightColor });
    } else if (editingHighlight) {
      updateHighlight({
        oldName: editingHighlight,
        name: highlightName.trim(),
        color: highlightColor,
      });
    }

    handleCancelEdit();
  };

  const handleDeleteHighlight = (name) => {
    deleteHighlight(name);
  };

  const handleSelectPresetColor = (color) => {
    setHighlightColor(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e) => {
    const value = e.target.value;
    setCustomColor(value);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
      setHighlightColor(value);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const highlightEntries = Array.from(highlights.entries());
      const oldIndex = highlightEntries.findIndex(([name]) => name === active.id);
      const newIndex = highlightEntries.findIndex(([name]) => name === over.id);

      const reorderedEntries = arrayMove(highlightEntries, oldIndex, newIndex);
      const orderedNames = reorderedEntries.map(([name]) => name);

      reorderHighlights(orderedNames);
    }
  };

  const renderHighlightsList = () => {
    const highlightEntries = Array.from(highlights.entries());
    const highlightNames = highlightEntries.map(([name]) => name);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={highlightNames}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.highlightsList}>
            {highlightEntries.map(([name, data]) => (
              <SortableHighlightItem
                key={name}
                id={name}
                name={name}
                data={data}
                onEdit={handleStartEditHighlight}
                onDelete={handleDeleteHighlight}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  const renderHighlightEditor = () => {
    if (!isAddingNew && !editingHighlight) return null;

    return (
      <div className={styles.highlightEditor}>
        <input
          className={styles.Input}
          type="text"
          placeholder="Type name"
          value={highlightName}
          onChange={(e) => setHighlightName(e.target.value)}
        />
        <div className={styles.colorPicker}>
          <div className={styles.colorPresets}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                className={`${styles.colorPreset} ${
                  highlightColor === preset.color ? styles.selected : ''
                }`}
                style={{ backgroundColor: preset.color }}
                onClick={() => handleSelectPresetColor(preset.color)}
                title={preset.name}
              />
            ))}
          </div>
          <div className={styles.customColorInput}>
            <input
              className={styles.Input}
              type="text"
              placeholder="#FFFFFF"
              value={customColor}
              onChange={handleCustomColorChange}
            />
            <div
              className={styles.colorPreview}
              style={{ backgroundColor: highlightColor }}
            />
          </div>
        </div>
        <div className={styles.editorActions}>
          <button className={styles.cancelBtn} onClick={handleCancelEdit}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSaveHighlight}>
            {isAddingNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  const renderThemes = () => {
    return Object.keys(availableThemes).map((theme, index) => {
      const colors = availableThemes[theme];
      return (
        <button
          key={`theme-${theme}`}
          className={`${styles.theme} ${
            currentTheme == theme && styles.current
          }`}
          onClick={() => {
            setTheme(theme);
          }}
        >
          <div
            className={styles.color1}
            style={{ background: colors.primary }}
          ></div>
        </button>
      );
    });
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <div className={styles.iconHolder}>
          <SettingsIcon className={styles.settingsIcon} />
        </div>
      </Dialog.Trigger>
      <Dialog.Portal container={document.getElementById('dialog')}>
        <Dialog.Overlay className={styles.DialogOverlay} />
        <Dialog.Content className={styles.DialogContent}>
          <Dialog.Title className={styles.DialogTitle}>Settings</Dialog.Title>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Appearance
            </label>
            <div className={styles.themes}>{renderThemes()}</div>
          </fieldset>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Card Types
            </label>
            {renderHighlightsList()}
            {renderHighlightEditor()}
            {!isAddingNew && !editingHighlight && (
              <button
                className={styles.addHighlightBtn}
                onClick={handleStartAddHighlight}
              >
                + Add new type
              </button>
            )}
          </fieldset>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Select your AI provider
            </label>
            <AISettingTabs APIkey={APIkey} setCurrentKey={setCurrentKey} />
          </fieldset>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              AI personality prompt
            </label>
            <textarea
              className={styles.Textarea}
              placeholder="Enter your own prompt for AI reflections"
              value={prompt}
              onChange={handleOnChangePrompt}
            />
          </fieldset>
          <div
            style={{
              display: 'flex',
              marginTop: 25,
              justifyContent: 'flex-end',
            }}
          >
            <Dialog.Close asChild>
              <button className={styles.Button} onClick={handleSaveChanges}>
                Save changes
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <button className={styles.IconButton} aria-label="Close">
              <CrossIcon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
