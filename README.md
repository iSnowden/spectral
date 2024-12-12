# Spectral

<img src="https://raw.githubusercontent.com/iSnowden/spectral/refs/heads/main/resources/icon.png" alt="Spectral Application" width="100">

Spectral is a JavaScript and Electron-based transcription of the project [Deceive](https://github.com/molenzwiebel/Deceive). This project aims to replicate the main functionalities of Deceive, an application that allows users to appear offline on the League of Legends client. Please note that not all features from the original project are included in this version. For the complete version, please download the original [Deceive](https://github.com/molenzwiebel/Deceive).

This project has been created for educational purposes to help me learn and practice development skills.

## Features

- **Appear Offline**: Change your status to appear offline to your friends in the League of Legends client.
- **Tray Icon**: Control the application from the system tray.
- **Automatic Updates**: The application checks for updates and notifies you when a new version is available.

## Installation

To use Spectral, follow these steps:

1. **Download the Application**:
   - Go to the [Releases](https://github.com/iSnowden/spectral/releases) section of this repository.
   - Download the latest release for your operating system.

2. **Run the Application**:
   - Extract the downloaded archive and run the executable file.

## Building from Source

If you prefer to build the application from source, follow these steps:

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/iSnowden/spectral.git
    cd spectral
    ```

2. **Install Dependencies**:
    ```bash
    npm install
    ```

3. **Create a Certificate**:
    - Create a `certificate.pfx` file and place it in the `resources` folder.

4. **Run the Application**:
    ```bash
    npm start
    ```

5. **Build the Application**:
    ```bash
    npm run build
    ```

    This will generate the necessary files in the `dist` folder, which can be used to create a release.

## Usage

Once the application is running, you can control it from the system tray. Click the tray icon to access options such as changing your status and quitting the application.

## Note

This project is a simplified version of [Deceive](https://github.com/molenzwiebel/Deceive). If you are looking for the complete set of features, please use the original Deceive application.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Deceive](https://github.com/molenzwiebel/Deceive) by molenzwiebel

---

<img src="https://raw.githubusercontent.com/iSnowden/spectral/refs/heads/main/resources/icon.png" alt="Spectral Application" width="100">
