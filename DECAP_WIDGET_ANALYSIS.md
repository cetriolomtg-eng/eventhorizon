# Decap CMS - Widget System & Editor Architecture

## 1. Widget System Deep Analysis

### Core Widget Architecture
```javascript
// Widget registration pattern (inferito dal debugging)
const widgetRegistry = {
  string: StringWidget,
  text: TextWidget,
  markdown: MarkdownWidget,
  boolean: BooleanWidget,
  date: DateWidget,
  datetime: DateTimeWidget,
  image: ImageWidget,
  file: FileWidget,
  select: SelectWidget,
  // ... altri widget
};

// Widget lookup
function getWidget(widgetType) {
  return widgetRegistry[widgetType] || widgetRegistry.string;
}
```

### Widget Component Structure
```javascript
// Struttura widget standard (pattern React)
class DecapWidget extends React.Component {
  // Required methods
  render() {
    // Render input UI
  }
  
  // Optional lifecycle methods
  componentDidMount() {
    // Initialize widget
  }
  
  // Value handling
  handleChange(value) {
    this.props.onChange(value);
  }
  
  // Validation
  validate(value) {
    // Return validation errors or null
  }
  
  // Serialization for file save
  serialize(value) {
    return value; // Transform for YAML/JSON output
  }
  
  // Deserialization from file
  deserialize(value) {
    return value; // Transform from YAML/JSON input
  }
}
```

## 2. Field Configuration to Widget Mapping

### Configuration Transform Process
```yaml
# YAML field config
fields:
  - label: "Post Title"
    name: "title"
    widget: "string"
    required: true
    hint: "Enter a catchy title"
```

```javascript
// Transformed to widget props
const widgetProps = {
  label: "Post Title",
  name: "title",
  widget: "string",
  required: true,
  hint: "Enter a catchy title",
  value: currentValue,
  onChange: handleFieldChange,
  hasError: validationErrors.title,
  errorMessage: validationErrors.title?.message
};
```

### Widget Prop Processing
```javascript
// Internal prop processing (inferito)
function processWidgetProps(fieldConfig, currentValue, callbacks) {
  return {
    // Basic props
    ...fieldConfig,
    value: currentValue,
    
    // Callbacks
    onChange: callbacks.onChange,
    onBlur: callbacks.onBlur,
    onFocus: callbacks.onFocus,
    
    // Validation state
    hasError: callbacks.hasError(),
    errorMessage: callbacks.getErrorMessage(),
    
    // UI state
    isDisabled: callbacks.isDisabled(),
    isRequired: fieldConfig.required || false
  };
}
```

## 3. Dynamic UI Generation

### Collection to Editor Transform
```javascript
// Collection config to editor UI (processo inferito)
function generateEditor(collectionConfig) {
  const { fields } = collectionConfig;
  
  return fields.map(fieldConfig => {
    const WidgetComponent = getWidget(fieldConfig.widget);
    const props = processWidgetProps(fieldConfig, currentValue, callbacks);
    
    return React.createElement(FieldWrapper, {
      key: fieldConfig.name,
      field: fieldConfig
    }, React.createElement(WidgetComponent, props));
  });
}
```

### Editor Layout System
```javascript
// Layout structure (pattern osservato)
<EditorInterface>
  <EditorSidebar>
    <PublishButton />
    <SaveDraftButton />
    <PreviewToggle />
  </EditorSidebar>
  
  <EditorMain>
    <EditorToolbar />
    <FieldsContainer>
      {fields.map(field => (
        <FieldWrapper key={field.name}>
          <FieldLabel>{field.label}</FieldLabel>
          <WidgetComponent {...fieldProps} />
          <FieldError>{field.error}</FieldError>
          <FieldHint>{field.hint}</FieldHint>
        </FieldWrapper>
      ))}
    </FieldsContainer>
  </EditorMain>
  
  <PreviewPane>
    <PreviewIframe />
  </PreviewPane>
</EditorInterface>
```

## 4. Widget Implementations Analysis

### String Widget
```javascript
// String widget implementation (pattern standard)
const StringWidget = {
  component: ({ value, onChange, ...props }) => (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={props.hint}
      required={props.required}
      disabled={props.isDisabled}
    />
  ),
  
  validate: (value, field) => {
    if (field.required && !value) {
      return 'This field is required';
    }
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return 'Format is invalid';
    }
    return null;
  }
};
```

### Markdown Widget
```javascript
// Markdown widget (più complesso)
const MarkdownWidget = {
  component: class extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        mode: 'write', // 'write' | 'preview'
        toolbar: true
      };
    }
    
    render() {
      return (
        <div className="markdown-editor">
          <MarkdownToolbar />
          {this.state.mode === 'write' ? (
            <TextArea
              value={this.props.value}
              onChange={this.props.onChange}
            />
          ) : (
            <MarkdownPreview content={this.props.value} />
          )}
        </div>
      );
    }
  }
};
```

### Image Widget
```javascript
// Image widget con upload handling
const ImageWidget = {
  component: ({ value, onChange, mediaFolder }) => {
    const handleUpload = async (file) => {
      // Upload to media folder
      const uploadedFile = await uploadToMediaFolder(file, mediaFolder);
      onChange(uploadedFile.path);
    };
    
    return (
      <div className="image-widget">
        {value ? (
          <ImagePreview src={value} onRemove={() => onChange('')} />
        ) : (
          <ImageUpload onUpload={handleUpload} />
        )}
      </div>
    );
  }
};
```

## 5. Validation System

### Field-level Validation
```javascript
// Validation pipeline per field
function validateField(fieldConfig, value) {
  const widget = getWidget(fieldConfig.widget);
  
  // Built-in validation
  let error = widget.validate?.(value, fieldConfig);
  
  // Custom validation rules
  if (!error && fieldConfig.pattern) {
    if (!new RegExp(fieldConfig.pattern).test(value)) {
      error = fieldConfig.error || 'Invalid format';
    }
  }
  
  return error;
}
```

### Form-level Validation
```javascript
// Validation completa del form
function validateEntry(collectionConfig, entryData) {
  const errors = {};
  
  collectionConfig.fields.forEach(field => {
    const value = entryData[field.name];
    const error = validateField(field, value);
    
    if (error) {
      errors[field.name] = error;
    }
  });
  
  return Object.keys(errors).length > 0 ? errors : null;
}
```

## 6. Preview System Architecture

### Preview Template Registration
```javascript
// Custom preview template (API pubblica)
window.CMS.registerPreviewTemplate('posts', ({ entry, widgetFor, widgetsFor }) => {
  return React.createElement('div', {
    className: 'preview-container'
  }, [
    React.createElement('h1', {}, entry.getIn(['data', 'title'])),
    React.createElement('div', {}, widgetFor('body'))
  ]);
});
```

### Preview Data Flow
```javascript
// Preview update flow (inferito)
function updatePreview(entryData) {
  const previewData = {
    entry: Immutable.fromJS(entryData),
    widgetFor: (fieldName) => renderWidgetPreview(fieldName, entryData[fieldName]),
    widgetsFor: (fieldName) => renderWidgetsPreview(fieldName, entryData[fieldName])
  };
  
  const PreviewComponent = getPreviewTemplate(collectionName);
  ReactDOM.render(
    React.createElement(PreviewComponent, previewData),
    previewContainer
  );
}
```

## 7. State Management System

### Entry State Structure
```javascript
// Internal entry state (pattern Redux-like)
const entryState = {
  // Original data from file
  original: {
    title: 'Original Title',
    body: 'Original content...'
  },
  
  // Current working data
  data: {
    title: 'Modified Title',
    body: 'Modified content...'
  },
  
  // UI state
  ui: {
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: true,
    validationErrors: {
      title: null,
      body: 'Required field'
    }
  },
  
  // Metadata
  meta: {
    collection: 'posts',
    slug: 'my-post',
    path: 'content/posts/my-post.md',
    lastModified: '2025-10-04T10:00:00Z'
  }
};
```

### State Update Pattern
```javascript
// State updates (pattern Redux-like)
function updateEntryField(fieldName, value) {
  return {
    type: 'ENTRY_FIELD_UPDATE',
    payload: { fieldName, value }
  };
}

function entryReducer(state, action) {
  switch (action.type) {
    case 'ENTRY_FIELD_UPDATE':
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.fieldName]: action.payload.value
        },
        ui: {
          ...state.ui,
          hasUnsavedChanges: true
        }
      };
    // ... altri action types
  }
}
```

## 8. Custom Widget Development

### Widget Development Pattern
```javascript
// Custom widget development
const CustomRatingWidget = {
  // Widget component
  component: React.forwardRef(({ value, onChange, field }) => {
    const [rating, setRating] = React.useState(value || 0);
    
    const handleRatingClick = (newRating) => {
      setRating(newRating);
      onChange(newRating);
    };
    
    return React.createElement('div', { className: 'rating-widget' },
      [1, 2, 3, 4, 5].map(star =>
        React.createElement('button', {
          key: star,
          onClick: () => handleRatingClick(star),
          className: star <= rating ? 'star active' : 'star'
        }, '★')
      )
    );
  }),
  
  // Validation
  validate: (value, field) => {
    if (field.required && !value) return 'Rating is required';
    if (value < 1 || value > 5) return 'Rating must be between 1 and 5';
    return null;
  }
};

// Registration
window.CMS.registerWidget('rating', CustomRatingWidget);
```

### Widget Registration API
```javascript
// Available registration methods (API pubblica)
window.CMS.registerWidget('widgetName', widgetDefinition);
window.CMS.registerPreviewTemplate('collectionName', previewComponent);
window.CMS.registerPreviewStyle('/path/to/preview.css');
window.CMS.registerEditorComponent(editorComponentDefinition);
```

## 9. Performance Considerations

### Widget Rendering Optimization
- **Lazy Loading**: Widget loaded solo quando necessario
- **Memoization**: Preview updates ottimizzati
- **Virtual Scrolling**: Per collection con molti entry
- **Debounced Updates**: Preview non aggiornato ad ogni keystroke

### Memory Management
- **Component Cleanup**: Proper unmounting dei widget
- **Event Listeners**: Cleanup on component destroy
- **File Uploads**: Progress tracking e cleanup

---

*Analisi basata su reverse engineering del sistema di widget - Ottobre 2025*