# Tagged Lines Organizer Plugin for Obsidian

## Overview

The Tagged Lines Organizer Plugin for Obsidian is a powerful tool that allows users to fetch lines from their notes using associated tags and properties, and visualize them using a Kanban-style view. With this plugin, users can easily organize and manage their tasks, ideas, or any other tagged lines within their Obsidian vault.

## Features

- Fetch lines from notes based on tags and properties
- Visualize lines using a customizable Kanban view
- Organize lines into columns corresponding to property values
- Drag and drop lines between columns for easy organization
- Filter and sort lines based on tags and properties
- Save and load Kanban view configurations
- Synchronize changes made in the Kanban view with the original notes

## Installation

1. Download the latest release of the Tagged Lines Organizer Plugin from the GitHub repository.
2. Extract the downloaded ZIP file and copy the `tagged-lines-organizer` folder to your Obsidian vault's plugins directory (`.obsidian/plugins/`).
3. Reload Obsidian or restart the application.
4. Enable the Tagged Lines Organizer Plugin in the Obsidian settings under the "Community plugins" tab.

## Usage

### Setting up Tags and Properties

To use the Tagged Lines Organizer Plugin effectively, you need to tag your lines and assign properties to them. Here's how you can do it:

1. Open a note in Obsidian.
2. Add tags to a line by prefixing them with a `#`, e.g., `#task`.
3. Assign properties to a line by using the format `[property:: value]`, e.g., `[priority:: high]`.

Example tagged line:
```
- [ ] Finish project proposal #task [priority:: high] [due:: 2023-06-30]
```

### Opening the Kanban View

1. Click on the Tagged Lines Organizer Plugin icon in the left sidebar of Obsidian.
2. Alternatively, you can open the Command Palette (`Ctrl+P` or `Cmd+P`) and search for "Tagged Lines Organizer: Open Kanban View".

### Configuring the Kanban View

1. In the Kanban view, click on the "Settings" button.
2. Choose the tags and properties you want to use for fetching lines.
3. Customize the columns that you want to display
4. Click "Apply" to save the configuration.

### Using the Kanban View

- The Kanban view displays lines organized into columns based on the selected property values.
- You can drag and drop lines between columns to change their property values.
- Use the filter and sort options to narrow down the displayed lines based on tags and properties.
- Collapse or expand lines informations 
- Changes made in the Kanban view will be synchronized with the original notes.

### Saving and Loading Kanban View Configurations

1. To save the current Kanban view configuration, click on the "Save" button in the Kanban view header.
2. Enter a name for the configuration and click "Save".
3. To load a previously saved configuration, click on the "Load" button and select the desired configuration from the list.

## Customization

The Tagged Lines Organizer Plugin provides various customization options to tailor the Kanban view to your needs. You can modify the following settings:

- **Tags**: Select the tags to use for fetching lines.
- **Properties**: Choose the properties to display and use for organizing lines into columns.
- **Column Names**: Customize the names of the columns based on property values.


## Feedback and Contributions

If you encounter any issues, have suggestions for improvements, or would like to contribute to the development of the Tagged Lines Organizer Plugin, please visit the GitHub repository and submit an issue or pull request.

We appreciate your feedback and contributions to make this plugin better for the Obsidian community.

## License

The Tagged Lines Organizer Plugin is released under the MIT License. See the [LICENSE](LICENSE) file for more details.

