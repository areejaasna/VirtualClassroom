import React, { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import Constants from 'expo-constants';

export default function App() {
  const { ML_API } = Constants.expoConfig.extra;
  
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [prediction, setPrediction] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Capture image and send it to the backend API for prediction
  const captureAndPredict = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri); // Store the captured image URI
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      try {
        const response = await axios.post(`${ML_API}predict`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log(response.data);
        setPrediction(response.data.detected_faces); // Store the detected faces and emotions
      } catch (error) {
        console.error('Error predicting:', error.response ? error.response.data : error.message);
      }
    }
  };

  const renderPredictionBoxes = () => {
    return prediction?.map((face, index) => {
      const { bounding_box, emotion } = face;
      const [left, top, right, bottom] = bounding_box;

      return (
        <View
          key={index}
          style={[
            styles.boundingBox,
            {
              left: left,
              top: top,
              width: right - left,
              height: bottom - top,
            },
          ]}
        >
          <Text style={styles.emotionText}>{emotion}</Text>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} />}
        {prediction && renderPredictionBoxes()}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={captureAndPredict}>
            <Text style={styles.text}>Capture & Predict</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => {setPhotoUri(null);setPrediction(null)}}>
            <Text style={styles.text}>Clear Photo</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      {prediction && prediction.length > 0 && (
        <View style={styles.predictionContainer}>
          {prediction.map((face, index) => (
            <Text key={index} style={styles.predictionText}>
              Face {index + 1}: Emotion - {face.emotion}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  photoPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  emotionText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  button: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  predictionContainer: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    width: '80%',
    alignSelf: 'center',
  },
  predictionText: {
    fontSize: 18,
    color: 'white',
  },
});
