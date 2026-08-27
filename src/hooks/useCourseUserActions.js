import { useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { AdminerApi } from '../services/adminer-api';
import { exportToCsv } from '../components/CsvExporter';

export function useCourseUserActions({ courseId, courseShortname, handleUserAction, sortedUsers, setSelectedUsers }) {
  const { addToast } = useToast();
  
  // CSV Exportation
  const [isExportingDetails, setIsExportingDetails] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState('visible');

  // User Expiration
  const [expirationModalOpen, setExpirationModalOpen] = useState(false);
  const [expirationUserIds, setExpirationUserIds] = useState([]);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  // User Messaging
  const [userMessageModalOpen, setUserMessageModalOpen] = useState(false);
  const [userMessageText, setUserMessageText] = useState('');
  
  // User Group
  const [userGroupModalOpen, setUserGroupModalOpen] = useState(false);
  const [userGroupSelection, setUserGroupSelection] = useState('0');
  const [userNewGroupName, setUserNewGroupName] = useState('');

  const handleSetExpirationSubmit = async () => {
    const timeend = expirationEnabled && expirationDate ? Math.floor(new Date(expirationDate).getTime() / 1000) : 0;
    await handleUserAction('set_expiration', expirationUserIds, { timeend });
    setSelectedUsers([]);
    setExpirationModalOpen(false);
  };

  const handleUserMessageSubmit = async (selectedUsers) => {
    if (!userMessageText.trim()) return;
    await handleUserAction('message', selectedUsers, { message_text: userMessageText });
    setSelectedUsers([]);
    setUserMessageModalOpen(false);
    setUserMessageText('');
  };

  const handleUserGroupSubmit = async (selectedUsers) => {
    await handleUserAction('setgroup', selectedUsers, {
      groupid: userGroupSelection === 'new' ? 0 : parseInt(userGroupSelection),
      newgroupname: userGroupSelection === 'new' ? userNewGroupName : ''
    });
    setSelectedUsers([]);
    setUserGroupModalOpen(false);
  };

  const exportUsersCSV = () => {
    if (!sortedUsers.length) return;
    const cols = [
      { label: 'ID', accessor: 'id' },
      { label: 'Nombre', accessor: 'fullname' },
      { label: 'Email', accessor: 'email' },
      { label: 'Progreso', accessor: row => `${row.progress}%` },
      { label: 'Estado', accessor: row => row.status === 0 ? 'Activo' : 'Suspendido' },
      { label: 'Roles', accessor: row => row.roles || '' }
    ];
    exportToCsv(`curso_${courseShortname}_usuarios_resumen`, sortedUsers, cols);
  };

  const exportDetailedProgressCSV = async () => {
    if (!sortedUsers.length) return;
    setIsExportingDetails(true);
    
    try {
      addToast({ type: 'info', title: 'Generando reporte detallado, esto puede tardar unos momentos...' });
      const detailedUsers = [];
      const activityColumns = new Set();
      
      for (const u of sortedUsers) {
        const detail = await AdminerApi.getCourseUserDetail(courseId, u.id);
        const activities = detail.activities || [];
        const userRow = {
          id: u.id,
          fullname: u.fullname,
          email: u.email,
          progress: u.progress,
          status: u.status,
          roles: u.roles,
          activitiesObj: {}
        };
        
        activities.forEach(act => {
          activityColumns.add(act.name);
          let statusStr = 'Pendiente';
          if (act.completionstatus === 1 || act.completionstatus === 2) {
            statusStr = 'Completado';
          }
          userRow.activitiesObj[act.name] = `${statusStr} ${act.grade ? '(' + act.grade + ')' : ''}`.trim();
        });
        
        detailedUsers.push(userRow);
      }
      
      const activityHeaders = Array.from(activityColumns);
      
      const cols = [
        { label: 'ID', accessor: 'id' },
        { label: 'Nombre', accessor: 'fullname' },
        { label: 'Email', accessor: 'email' },
        { label: 'Progreso General', accessor: row => `${row.progress}%` },
        { label: 'Estado', accessor: row => row.status === 0 ? 'Activo' : 'Suspendido' },
        { label: 'Roles', accessor: row => row.roles || '' },
        ...activityHeaders.map(col => ({
          label: col,
          accessor: row => row.activitiesObj[col] || '-'
        }))
      ];
      
      exportToCsv(`curso_${courseShortname}_progreso_detallado`, detailedUsers, cols);
      
      addToast({ type: 'success', title: 'Reporte detallado generado exitosamente' });
    } catch (error) {
      addToast({ type: 'error', title: 'Error al generar reporte', description: error.message });
    } finally {
      setIsExportingDetails(false);
    }
  };

  const handleExport = async () => {
    if (exportOption === 'visible') {
      exportUsersCSV();
      setExportModalOpen(false);
    } else {
      await exportDetailedProgressCSV();
      setExportModalOpen(false);
    }
  };

  return {
    exportState: {
      isExportingDetails,
      exportModalOpen,
      setExportModalOpen,
      exportOption,
      setExportOption,
      handleExport
    },
    expirationState: {
      expirationModalOpen,
      setExpirationModalOpen,
      expirationUserIds,
      setExpirationUserIds,
      expirationDate,
      setExpirationDate,
      expirationEnabled,
      setExpirationEnabled,
      handleSetExpirationSubmit
    },
    messageState: {
      userMessageModalOpen,
      setUserMessageModalOpen,
      userMessageText,
      setUserMessageText,
      handleUserMessageSubmit
    },
    groupState: {
      userGroupModalOpen,
      setUserGroupModalOpen,
      userGroupSelection,
      setUserGroupSelection,
      userNewGroupName,
      setUserNewGroupName,
      handleUserGroupSubmit
    }
  };
}
