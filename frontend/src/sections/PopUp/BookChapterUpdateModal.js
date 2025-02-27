import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import Slide from '@mui/material/Slide';
import { useFormik, Form, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { Container, Grid, TextField, FormGroup, FormControlLabel, Switch, IconButton, Stack, Button } from '@mui/material';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { LoadingButton } from '@mui/lab';
import MyEditor from 'src/components/common/Editor';
import authorChapterServices from 'src/Services/WebApiHandler/authorChapterServices';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { renderAction } from 'src/Redux/Action/renderAction';
import AiAccordion from 'src/components/ai/AiAccordion';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { aiService } from 'src/Services/ApiHandlers/aiService';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BookChapterUpdateModal