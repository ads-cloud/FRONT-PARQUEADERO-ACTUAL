import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getVehicleIcon } from '../utils/vehicleValidation';

export default function ParkingAdmin() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('PARKINGS', 'create');
  const canEdit = hasPermission('PARKINGS', 'edit');
  const canDelete = hasPermission('PARKINGS', 'delete');

  const canCreateUsers = hasPermission('USERS', 'create');
  const canEditUsers = hasPermission('USERS', 'edit');
  const canDeleteUsers = hasPermission('USERS', 'delete');

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'INACTIVE'
  const [companies, setCompanies] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de Parqueadero / Razón Social (Company)
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    id: null,
    businessName: '',
    taxId: '',
    phone: '',
    email: '',
    legalAddress: '',
    createInitialBranch: true,
    initialBranchName: 'Sede Principal',
    initialBranchAddress: '',
    initialCarCapacity: 50,
    initialMotorcycleCapacity: 30,
    initialBicycleCapacity: 20,
    createInitialAdmin: false,
    initialAdminUsername: '',
    initialAdminPassword: '',
  });

  // Modal de Sede (Parking) con cupos independientes por tipo de vehículo
  const [parkingModalOpen, setParkingModalOpen] = useState(false);
  const [parkingForm, setParkingForm] = useState({
    id: null,
    companyId: '',
    name: '',
    address: '',
    phone: '',
    schedule: '',
    notes: '',
    carCapacity: 50,
    motorcycleCapacity: 30,
    bicycleCapacity: 20,
  });

  // Modal integrado para Crear / Editar / Asignar Administrador en la misma tarjeta
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminModalState, setAdminModalState] = useState({
    mode: 'CREATE', // 'CREATE' | 'EDIT_SEDES' | 'ASSIGN_EXISTING'
    company: null,
    targetUser: null,
    existingAdminId: '',
    username: '',
    password: '',
    selectedParkingIds: [],
    saving: false,
  });

  // Modal integrado para Restablecer Contraseña de un Administrador
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests = [
        axios.get('/api/parking/companies'),
        axios.get('/api/parking'),
      ];
      if (hasPermission('USERS', 'view')) {
        requests.push(axios.get('/api/users'));
      }
      const [compRes, parkRes, usersRes] = await Promise.all(requests);
      setCompanies(compRes.data || []);
      setParkings(parkRes.data || []);
      if (usersRes?.data) {
        setAdminUsers(usersRes.data.filter((u) => u.role === 'ADMIN'));
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los parqueaderos, sedes y administradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Helpers para obtener Sedes y Administradores de cada Parqueadero ---
  const getAllCompanyParkings = (company) => {
    if (company?.parkings && company.parkings.length > 0) {
      return company.parkings;
    }
    return parkings.filter((p) => Number(p.companyId) === Number(company?.id));
  };

  const getCompanyAdmins = (companyParkings) => {
    const companyParkingIds = new Set(
      companyParkings.map((p) => Number(p.id)),
    );
    return adminUsers.filter((u) =>
      (u.managedParkings || []).some((mp) =>
        companyParkingIds.has(Number(mp.id)),
      ),
    );
  };

  // Separación de Empresas y Sedes entre Activas e Inactivas
  const activeCompanies = useMemo(
    () => companies.filter((c) => c.isActive !== false),
    [companies],
  );

  const activeParkingsCount = useMemo(
    () =>
      activeCompanies.reduce((sum, c) => {
        const activeSedes = getAllCompanyParkings(c).filter(
          (p) => p.isActive !== false,
        );
        return sum + activeSedes.length;
      }, 0),
    [activeCompanies, parkings],
  );

  // Tarjetas para la pestaña INACTIVAS:
  // 1) Empresas inactivas completas
  // 2) Empresas activas que tienen al menos 1 sede inactiva
  const inactiveCards = useMemo(() => {
    const result = [];
    for (const c of companies) {
      const allSedes = getAllCompanyParkings(c);
      if (c.isActive === false) {
        result.push({
          company: c,
          isCompanyInactive: true,
          sedes: allSedes,
        });
      } else {
        const inactiveSedes = allSedes.filter((p) => p.isActive === false);
        if (inactiveSedes.length > 0) {
          result.push({
            company: c,
            isCompanyInactive: false,
            sedes: inactiveSedes,
          });
        }
      }
    }
    return result;
  }, [companies, parkings]);

  const inactiveCompaniesCount = useMemo(
    () => companies.filter((c) => c.isActive === false).length,
    [companies],
  );

  const inactiveSedesCount = useMemo(
    () =>
      companies.reduce((sum, c) => {
        const allSedes = getAllCompanyParkings(c);
        if (c.isActive === false) return sum + allSedes.length;
        return sum + allSedes.filter((p) => p.isActive === false).length;
      }, 0),
    [companies, parkings],
  );

  // --- Reactivar Empresa o Sede desde la pestaña de Inactivos ---
  const handleReactivateCompany = async (company) => {
    const confirm = await Swal.fire({
      title: '¿Reactivar Parqueadero?',
      html: `Se volverá a habilitar la empresa <strong>${company.businessName}</strong> (NIT: ${company.taxId}).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.put(`/api/parking/companies/${company.id}`, {
        isActive: true,
      });
      toast.success('Parqueadero reactivado. Ahora puede gestionar sus sedes en la pestaña Activos.');
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al reactivar el parqueadero',
      );
    }
  };

  const handleReactivateParking = async (parking) => {
    const confirm = await Swal.fire({
      title: '¿Reactivar Sede?',
      html: `La sede <strong>${parking.name}</strong> volverá a estar disponible y editable en la pestaña de Activos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, reactivar sede',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.put(`/api/parking/${parking.id}`, {
        isActive: true,
      });
      toast.success('Sede reactivada exitosamente');
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al reactivar la sede',
      );
    }
  };

  // --- Handlers de Parqueadero / Razón Social (Company) ---
  const handleOpenCreateCompany = () => {
    setCompanyForm({
      id: null,
      businessName: '',
      taxId: '',
      phone: '',
      email: '',
      legalAddress: '',
      createInitialBranch: true,
      initialBranchName: 'Sede Principal',
      initialBranchAddress: '',
      initialCarCapacity: 50,
      initialMotorcycleCapacity: 30,
      initialBicycleCapacity: 20,
      createInitialAdmin: false,
      initialAdminUsername: '',
      initialAdminPassword: '',
    });
    setCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (company) => {
    if (company.isActive === false) {
      return toast.error('No se puede modificar un Parqueadero inactivo');
    }
    setCompanyForm({
      id: company.id,
      businessName: company.businessName || '',
      taxId: company.taxId || '',
      phone: company.phone || '',
      email: company.email || '',
      legalAddress: company.legalAddress || '',
      createInitialBranch: false,
      initialBranchName: '',
      initialBranchAddress: '',
      initialCarCapacity: 50,
      initialMotorcycleCapacity: 30,
      initialBicycleCapacity: 20,
      createInitialAdmin: false,
      initialAdminUsername: '',
      initialAdminPassword: '',
    });
    setCompanyModalOpen(true);
  };

  const handleSubmitCompany = async (e) => {
    e.preventDefault();
    const payload = {
      businessName: companyForm.businessName.trim(),
      taxId: companyForm.taxId.trim(),
      phone: companyForm.phone || null,
      email: companyForm.email || null,
      legalAddress: companyForm.legalAddress || null,
    };

    try {
      if (companyForm.id) {
        await axios.put(`/api/parking/companies/${companyForm.id}`, payload);
        toast.success('Parqueadero actualizado correctamente');
      } else {
        const res = await axios.post('/api/parking/companies', payload);
        const createdCompanyId = res.data?.id;

        if (companyForm.createInitialBranch && createdCompanyId) {
          const carCap = Math.max(0, Number(companyForm.initialCarCapacity || 0));
          const motoCap = Math.max(
            0,
            Number(companyForm.initialMotorcycleCapacity || 0),
          );
          const bikeCap = Math.max(
            0,
            Number(companyForm.initialBicycleCapacity || 0),
          );

          const branchRes = await axios.post('/api/parking', {
            companyId: createdCompanyId,
            name: (companyForm.initialBranchName || 'Sede Principal').trim(),
            address: (
              companyForm.initialBranchAddress ||
              companyForm.legalAddress ||
              'Dirección Principal'
            ).trim(),
            phone: companyForm.phone || null,
            schedule: '8:00 am - 6:00 pm',
            notes: 'Conserve este tiquete.',
            totalCapacity: carCap + motoCap + bikeCap,
            capacities: [
              { vehicleTypeCode: 'CAR', capacity: carCap },
              { vehicleTypeCode: 'MOTORCYCLE', capacity: motoCap },
              { vehicleTypeCode: 'BICYCLE', capacity: bikeCap },
            ],
          });

          const createdBranchId = branchRes.data?.id;

          if (
            companyForm.createInitialAdmin &&
            createdBranchId &&
            companyForm.initialAdminUsername.trim() &&
            companyForm.initialAdminPassword.length >= 6
          ) {
            await axios.post('/api/users', {
              username: companyForm.initialAdminUsername.trim(),
              password: companyForm.initialAdminPassword,
              role: 'ADMIN',
              parkingId: createdBranchId,
              parkingIds: [createdBranchId],
            });
            toast.success(
              'Parqueadero, primera sede y Administrador creados exitosamente',
            );
          } else {
            toast.success('Parqueadero y primera sede creados exitosamente');
          }
        } else {
          toast.success('Parqueadero creado exitosamente');
        }
      }
      setCompanyModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al guardar el parqueadero',
      );
    }
  };

  const handleDeleteCompany = async (id) => {
    const targetCompany = companies.find((c) => Number(c.id) === Number(id));
    const confirm = await Swal.fire({
      title: '¿Eliminar / Inactivar Parqueadero?',
      html: targetCompany
        ? `Está a punto de eliminar o inactivar <strong>${targetCompany.businessName}</strong>.<br/><span style="font-size:13px;color:#64748b">Si tiene sedes asociadas, pasará a la pestaña de Inactivos junto con sus sedes y usuarios.</span>`
        : '¿Está seguro de eliminar o inactivar este Parqueadero?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/parking/companies/${id}`);
      toast.success(res.data?.message || 'Parqueadero procesado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  // --- Handlers de Sede (Parking) ---
  const handleOpenCreateParking = (preselectedCompanyId = '') => {
    const defaultCompanyId =
      preselectedCompanyId || activeCompanies[0]?.id || '';
    const parentCompany = activeCompanies.find(
      (c) => Number(c.id) === Number(defaultCompanyId),
    );
    if (!parentCompany) {
      return toast.error('No se pueden agregar sedes a un Parqueadero inactivo');
    }
    setParkingForm({
      id: null,
      companyId: defaultCompanyId,
      name: '',
      address: parentCompany?.legalAddress || '',
      phone: parentCompany?.phone || '',
      schedule: '8:00 am - 6:00 pm',
      notes: 'Conserve este tiquete.',
      carCapacity: 50,
      motorcycleCapacity: 30,
      bicycleCapacity: 20,
    });
    setParkingModalOpen(true);
  };

  const handleOpenEditParking = (parking) => {
    if (parking.isActive === false) {
      return toast.error('No se puede modificar una sede inactiva');
    }
    const caps = parking.capacitiesByType || [];
    const getCap = (code, fallback) => {
      const found = caps.find((c) => c.vehicleTypeCode === code);
      return found ? Number(found.capacity) : fallback;
    };

    setParkingForm({
      id: parking.id,
      companyId: parking.companyId || '',
      name: parking.name || '',
      address: parking.address || '',
      phone: parking.phone || '',
      schedule: parking.schedule || '',
      notes: parking.notes || '',
      carCapacity: getCap('CAR', 50),
      motorcycleCapacity: getCap('MOTORCYCLE', 30),
      bicycleCapacity: getCap('BICYCLE', 20),
    });
    setParkingModalOpen(true);
  };

  const handleSubmitParking = async (e) => {
    e.preventDefault();
    if (!parkingForm.companyId) {
      return toast.error(
        'Debe seleccionar el Parqueadero (Razón Social) al que pertenece la sede',
      );
    }

    const carCap = Math.max(0, Number(parkingForm.carCapacity || 0));
    const motoCap = Math.max(0, Number(parkingForm.motorcycleCapacity || 0));
    const bikeCap = Math.max(0, Number(parkingForm.bicycleCapacity || 0));
    const totalCapacity = carCap + motoCap + bikeCap;

    const payload = {
      companyId: Number(parkingForm.companyId),
      name: parkingForm.name.trim(),
      address: parkingForm.address.trim(),
      phone: parkingForm.phone || null,
      schedule: parkingForm.schedule || null,
      notes: parkingForm.notes || null,
      totalCapacity,
      capacities: [
        { vehicleTypeCode: 'CAR', capacity: carCap },
        { vehicleTypeCode: 'MOTORCYCLE', capacity: motoCap },
        { vehicleTypeCode: 'BICYCLE', capacity: bikeCap },
      ],
    };

    try {
      if (parkingForm.id) {
        await axios.put(`/api/parking/${parkingForm.id}`, payload);
        toast.success('Sede actualizada exitosamente');
      } else {
        await axios.post('/api/parking', payload);
        toast.success('Sede agregada al parqueadero exitosamente');
      }
      setParkingModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar la sede');
    }
  };

  const handleDeleteParking = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar / Inactivar Sede?',
      html: 'Si la sede tiene historial operativo pasará a la pestaña de <strong>Inactivos</strong> y sus usuarios exclusivos quedarán inactivos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar / inactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/parking/${id}`);
      toast.success(res.data?.message || 'Sede procesada');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar sede');
    }
  };

  // --- Handlers Integrados de Administradores (solo en Empresas/Sedes Activas) ---
  const handleOpenCreateAdminForCompany = (company) => {
    if (company.isActive === false) return;
    const companyActiveParkings = getAllCompanyParkings(company).filter(
      (p) => p.isActive !== false,
    );
    if (companyActiveParkings.length === 0) {
      return toast.error(
        'Primero agregue o active al menos una sede en este parqueadero para asignarle un Administrador',
      );
    }
    setAdminModalState({
      mode: 'CREATE',
      company,
      targetUser: null,
      existingAdminId: '',
      username: '',
      password: '',
      selectedParkingIds: companyActiveParkings.map((p) => Number(p.id)),
      saving: false,
    });
    setAdminModalOpen(true);
  };

  const handleOpenCreateAdminForSede = (company, parking) => {
    if (company.isActive === false || parking.isActive === false) return;
    setAdminModalState({
      mode: 'CREATE',
      company,
      targetUser: null,
      existingAdminId: '',
      username: '',
      password: '',
      selectedParkingIds: [Number(parking.id)],
      saving: false,
    });
    setAdminModalOpen(true);
  };

  const handleOpenEditAdminSedes = (company, adminUser) => {
    if (company.isActive === false) return;
    const fullAdmin =
      adminUsers.find((u) => Number(u.id) === Number(adminUser.id)) || adminUser;
    const currentIds = (fullAdmin.managedParkings || []).map((mp) =>
      Number(mp.id),
    );
    setAdminModalState({
      mode: 'EDIT_SEDES',
      company,
      targetUser: fullAdmin,
      existingAdminId: String(fullAdmin.id),
      username: fullAdmin.username,
      password: '',
      selectedParkingIds: currentIds,
      saving: false,
    });
    setAdminModalOpen(true);
  };

  const handleToggleAdminParkingId = (parkingId) => {
    const pid = Number(parkingId);
    setAdminModalState((prev) => {
      const exists = prev.selectedParkingIds.includes(pid);
      return {
        ...prev,
        selectedParkingIds: exists
          ? prev.selectedParkingIds.filter((id) => id !== pid)
          : [...prev.selectedParkingIds, pid],
      };
    });
  };

  const handleSelectAllCompanySedesInModal = (companyParkings) => {
    const companyIds = companyParkings.map((p) => Number(p.id));
    setAdminModalState((prev) => {
      const allSelected = companyIds.every((id) =>
        prev.selectedParkingIds.includes(id),
      );
      const next = allSelected
        ? prev.selectedParkingIds.filter((id) => !companyIds.includes(id))
        : Array.from(new Set([...prev.selectedParkingIds, ...companyIds]));
      return {
        ...prev,
        selectedParkingIds: next,
      };
    });
  };

  const handleSubmitAdminModal = async (e) => {
    e.preventDefault();
    if (adminModalState.selectedParkingIds.length === 0) {
      return toast.error('Debe seleccionar al menos una sede activa para el Administrador');
    }

    try {
      setAdminModalState((prev) => ({ ...prev, saving: true }));

      if (adminModalState.mode === 'CREATE') {
        if (!adminModalState.username.trim() || !adminModalState.password) {
          setAdminModalState((prev) => ({ ...prev, saving: false }));
          return toast.error('Ingrese usuario y contraseña temporal');
        }
        if (adminModalState.password.length < 6) {
          setAdminModalState((prev) => ({ ...prev, saving: false }));
          return toast.error('La contraseña debe tener al menos 6 caracteres');
        }

        await axios.post('/api/users', {
          username: adminModalState.username.trim(),
          password: adminModalState.password,
          role: 'ADMIN',
          parkingId: adminModalState.selectedParkingIds[0],
          parkingIds: adminModalState.selectedParkingIds,
        });
        toast.success('Administrador creado y asignado exitosamente');
      } else if (adminModalState.mode === 'ASSIGN_EXISTING') {
        if (!adminModalState.existingAdminId) {
          setAdminModalState((prev) => ({ ...prev, saving: false }));
          return toast.error('Seleccione el Administrador existente');
        }
        const existingUser = adminUsers.find(
          (u) => Number(u.id) === Number(adminModalState.existingAdminId),
        );
        const currentIds = (existingUser?.managedParkings || []).map((mp) =>
          Number(mp.id),
        );
        const mergedIds = Array.from(
          new Set([...currentIds, ...adminModalState.selectedParkingIds]),
        );

        await axios.put(`/api/users/${adminModalState.existingAdminId}`, {
          parkingId: mergedIds[0],
          parkingIds: mergedIds,
        });
        toast.success('Administrador asignado a las sedes seleccionadas');
      } else if (adminModalState.mode === 'EDIT_SEDES' && adminModalState.targetUser) {
        await axios.put(`/api/users/${adminModalState.targetUser.id}`, {
          parkingId: adminModalState.selectedParkingIds[0],
          parkingIds: adminModalState.selectedParkingIds,
        });
        toast.success('Sedes del Administrador actualizadas');
      }

      setAdminModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al guardar el Administrador',
      );
    } finally {
      setAdminModalState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleToggleAdminActive = async (adminUser) => {
    if (!canEditUsers) return;
    try {
      await axios.patch(`/api/users/${adminUser.id}/status`, {
        isActive: !adminUser.isActive,
      });
      toast.success(
        `Administrador ${!adminUser.isActive ? 'activado' : 'desactivado'}`,
      );
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'No se pudo cambiar el estado',
      );
    }
  };

  const handleDeleteAdminUser = async (adminUser) => {
    if (!canDeleteUsers) return;
    const confirm = await Swal.fire({
      title: '¿Eliminar Administrador?',
      html: `Se eliminará o desactivará al Administrador <strong>${adminUser.username}</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/users/${adminUser.id}`);
      toast.success(res.data?.message || 'Administrador eliminado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleOpenResetPassword = (adminUser) => {
    setResetTargetUser(adminUser);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetModalOpen(true);
  };

  const handleSubmitResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (resetPassword.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }
    if (resetPassword !== resetPasswordConfirm) {
      return toast.error('La confirmación de contraseña no coincide');
    }

    try {
      setResetSaving(true);
      await axios.post(`/api/users/${resetTargetUser.id}/reset-password`, {
        newPassword: resetPassword,
      });
      toast.success(
        'Contraseña restablecida. Se solicitará cambio en el próximo ingreso.',
      );
      setResetModalOpen(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Error al restablecer contraseña',
      );
    } finally {
      setResetSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">
        Cargando tarjetas de parqueaderos, sedes y administradores...
      </div>
    );
  }

  const computedTotalFormCapacity =
    Math.max(0, Number(parkingForm.carCapacity || 0)) +
    Math.max(0, Number(parkingForm.motorcycleCapacity || 0)) +
    Math.max(0, Number(parkingForm.bicycleCapacity || 0));

  const selectedCompanyForModal = activeCompanies.find(
    (c) => Number(c.id) === Number(parkingForm.companyId),
  );

  const modalCompanyParkings = adminModalState.company
    ? getAllCompanyParkings(adminModalState.company).filter(
        (p) => p.isActive !== false,
      )
    : [];

  return (
    <div className="space-y-5">
      {/* Cabecera Principal + Pestañas Activos / Inactivos */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                🏛️ Parqueaderos, Sedes y Administradores
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Gestione sus Parqueaderos activos o consulte el archivo de empresas y sedes inactivas (las inactivas están bloqueadas contra ediciones).
            </p>
          </div>

          {canCreate && activeTab === 'ACTIVE' && (
            <button
              onClick={handleOpenCreateCompany}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>🏛️</span>
              <span>+ Nuevo Parqueadero</span>
            </button>
          )}
        </div>

        {/* Barra de Pestañas: ACTIVOS vs INACTIVOS */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🟢</span>
            <span>Parqueaderos y Sedes Activas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-800/60 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeCompanies.length} Empresas • {activeParkingsCount} Sedes
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INACTIVE'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🔒</span>
            <span>Inactivos (Solo Lectura)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === 'INACTIVE'
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {inactiveCompaniesCount} Empresas • {inactiveSedesCount} Sedes
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          PESTAÑA 1: PARQUEADEROS Y SEDES ACTIVAS (GESTIÓN COMPLETA)
         ===================================================================== */}
      {activeTab === 'ACTIVE' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {activeCompanies.map((company) => {
              const companyActiveParkings = getAllCompanyParkings(
                company,
              ).filter((p) => p.isActive !== false);
              const companyAdmins = getCompanyAdmins(companyActiveParkings);
              const companyTotalSpots = companyActiveParkings.reduce(
                (sum, p) => sum + Number(p.totalCapacity || 0),
                0,
              );

              return (
                <div
                  key={company.id}
                  className="bg-white rounded-2xl shadow-xs hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col"
                >
                  {/* Cabecera de la Tarjeta del Parqueadero Activo */}
                  <div className="bg-slate-900 text-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-600/90 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                          🏛️
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-extrabold text-white leading-tight">
                              {company.businessName}
                            </h2>
                            <span className="text-[11px] font-mono font-bold bg-slate-800 text-blue-300 border border-slate-700 px-2 py-0.5 rounded-md">
                              NIT: {company.taxId}
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Activo
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1">
                            {company.legalAddress || 'Sin dirección principal'}
                            {company.phone ? ` • Tel: ${company.phone}` : ''}
                            {company.email ? ` • ${company.email}` : ''}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span className="text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                              📍 {companyActiveParkings.length}{' '}
                              {companyActiveParkings.length === 1
                                ? 'Sede activa'
                                : 'Sedes activas'}
                            </span>
                            <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                              🅿️ {companyTotalSpots} cupos totales
                            </span>
                            <span className="text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                              👤 {companyAdmins.length}{' '}
                              {companyAdmins.length === 1 ? 'Admin' : 'Admins'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Acciones de la Tarjeta del Parqueadero */}
                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-start shrink-0">
                        {canCreate && (
                          <button
                            onClick={() => handleOpenCreateParking(company.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>+ Agregar Sede</span>
                          </button>
                        )}
                        {canCreateUsers && companyActiveParkings.length > 0 && (
                          <button
                            onClick={() =>
                              handleOpenCreateAdminForCompany(company)
                            }
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Crear o asignar Administrador para este Parqueadero"
                          >
                            <span>👤 + Admin</span>
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditCompany(company)}
                            title="Editar datos del Parqueadero / Razón Social"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            title="Eliminar / Inactivar Parqueadero"
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta: Administradores del Parqueadero + Sedes Activas */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-5 bg-white">
                    {/* 1. Sección de Administradores de este Parqueadero */}
                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                          <span>👥 Administradores de este Parqueadero</span>
                          <span className="bg-purple-200/80 text-purple-900 px-2 py-0.2 rounded-full text-[11px]">
                            {companyAdmins.length}
                          </span>
                        </span>
                        {canCreateUsers && companyActiveParkings.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenCreateAdminForCompany(company)
                            }
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                          >
                            + Nuevo / Asignar Admin
                          </button>
                        )}
                      </div>

                      {companyAdmins.length === 0 ? (
                        <div className="flex items-center justify-between bg-white/80 border border-dashed border-purple-200 rounded-lg px-3 py-2 text-xs text-slate-500">
                          <span>
                            Sin administradores asignados a las sedes activas.
                          </span>
                          {canCreateUsers && companyActiveParkings.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenCreateAdminForCompany(company)
                              }
                              className="font-bold text-purple-700 hover:underline cursor-pointer"
                            >
                              Asignar ahora &rarr;
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {companyAdmins.map((admin) => {
                            const companyIds = companyActiveParkings.map((p) =>
                              Number(p.id),
                            );
                            const adminCompanySedes = (
                              admin.managedParkings || []
                            ).filter((mp) => companyIds.includes(Number(mp.id)));
                            const managesAllCompanySedes =
                              companyActiveParkings.length > 1 &&
                              adminCompanySedes.length ===
                                companyActiveParkings.length;

                            return (
                              <div
                                key={admin.id}
                                className="bg-white border border-purple-200/80 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-extrabold text-xs text-slate-900">
                                      👤 {admin.username}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={!canEditUsers}
                                      onClick={() =>
                                        handleToggleAdminActive(admin)
                                      }
                                      title="Clic para activar/desactivar"
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                                        admin.isActive
                                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      {admin.isActive ? 'Activo' : 'Inactivo'}
                                    </button>
                                    {managesAllCompanySedes && (
                                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                        Admin General (
                                        {companyActiveParkings.length} sedes)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className="text-[11px] text-slate-400">
                                      Sedes:
                                    </span>
                                    {adminCompanySedes.map((mp) => (
                                      <span
                                        key={mp.id}
                                        className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded"
                                      >
                                        📍 {mp.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  {canEditUsers && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenEditAdminSedes(
                                            company,
                                            admin,
                                          )
                                        }
                                        className="text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                        title="Cambiar qué sedes administra"
                                      >
                                        📍 Sedes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenResetPassword(admin)
                                        }
                                        className="text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                        title="Restablecer contraseña"
                                      >
                                        🔑 Clave
                                      </button>
                                    </>
                                  )}
                                  {canDeleteUsers && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteAdminUser(admin)
                                      }
                                      className="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                      title="Eliminar Administrador"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Sección de Sedes Activas de este Parqueadero */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Sedes Activas de {company.businessName} (
                          {companyActiveParkings.length})
                        </h3>
                      </div>

                      {companyActiveParkings.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
                          <p className="text-sm font-semibold text-slate-600">
                            Este parqueadero no tiene sedes activas
                          </p>
                          <p className="text-xs text-slate-400 mt-1 mb-3">
                            Agregue una sede nueva o reactive una sede desde la pestaña Inactivos.
                          </p>
                          {canCreate && (
                            <button
                              onClick={() => handleOpenCreateParking(company.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              + Agregar Sede
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {companyActiveParkings.map((parking) => {
                            const sedeAdmins = adminUsers.filter((u) =>
                              (u.managedParkings || []).some(
                                (mp) => Number(mp.id) === Number(parking.id),
                              ),
                            );

                            return (
                              <div
                                key={parking.id}
                                className="bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-4 transition-all"
                              >
                                {/* Fila superior de la Sede */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-base font-extrabold text-slate-900">
                                        📍 {parking.name}
                                      </span>
                                      <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        {parking.totalCapacity || 0} cupos totales
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {parking.address}
                                      {parking.phone
                                        ? ` • Tel: ${parking.phone}`
                                        : ''}
                                      {parking.schedule
                                        ? ` • ${parking.schedule}`
                                        : ''}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                    {canCreateUsers && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenCreateAdminForSede(
                                            company,
                                            parking,
                                          )
                                        }
                                        className="text-xs font-bold bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                        title="Crear o asignar Administrador para esta sede"
                                      >
                                        👤 + Admin Sede
                                      </button>
                                    )}
                                    {canEdit && (
                                      <button
                                        onClick={() =>
                                          handleOpenEditParking(parking)
                                        }
                                        className="text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                      >
                                        Editar Sede / Cupos
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() =>
                                          handleDeleteParking(parking.id)
                                        }
                                        className="text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Cupos independientes por tipo de vehículo */}
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                  {(parking.capacitiesByType || []).map((c) => (
                                    <div
                                      key={c.vehicleTypeCode}
                                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between"
                                    >
                                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 truncate">
                                        <span>
                                          {getVehicleIcon(c.vehicleTypeCode, c.vehicleTypeName)}
                                        </span>
                                        <span className="truncate">
                                          {c.vehicleTypeName}
                                        </span>
                                      </span>
                                      <span className="text-xs font-extrabold text-blue-700 ml-1">
                                        {c.capacity}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Administradores asignados a esta sede */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                                    <span className="font-semibold">
                                      👤 Admin de Sede:
                                    </span>
                                    {sedeAdmins.length > 0 ? (
                                      sedeAdmins.map((a) => (
                                        <span
                                          key={a.id}
                                          onClick={() =>
                                            canEditUsers &&
                                            handleOpenEditAdminSedes(company, a)
                                          }
                                          title="Clic para gestionar sedes de este Administrador"
                                          className={`font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                                            a.isActive
                                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                                              : 'bg-slate-200 text-slate-600 border-slate-300 line-through'
                                          }`}
                                        >
                                          {a.username}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                                        Sin administrador asignado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Botón inferior dentro de la tarjeta para agregar otra sede a este parqueadero */}
                    {canCreate && companyActiveParkings.length > 0 && (
                      <button
                        onClick={() => handleOpenCreateParking(company.id)}
                        className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>📍</span>
                        <span>
                          + Agregar nueva sede a {company.businessName}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {activeCompanies.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="text-4xl">🏛️</div>
              <h3 className="text-lg font-bold text-slate-800">
                No hay Parqueaderos activos
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Cree un nuevo Parqueadero (Razón Social) o consulte la pestaña de Inactivos si desea reactivar uno existente.
              </p>
              {canCreate && (
                <button
                  onClick={handleOpenCreateCompany}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-xs cursor-pointer"
                >
                  + Crear Parqueadero
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          PESTAÑA 2: INACTIVOS (SOLO LECTURA - BLOQUEADO CONTRA MODIFICACIONES)
         ===================================================================== */}
      {activeTab === 'INACTIVE' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2.5">
            <span className="text-lg">🔒</span>
            <span>
              <strong>Modo Archivo / Solo Lectura:</strong> Las empresas y sedes inactivas no permiten agregar sedes, asignar administradores ni modificar cupos. Si necesita volver a operar una empresa o sede, reactívela primero.
            </span>
          </div>

          {inactiveCards.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="text-3xl">✨</div>
              <h3 className="text-base font-bold text-slate-700">
                No hay empresas ni sedes inactivas
              </h3>
              <p className="text-xs text-slate-400">
                Todas las empresas y sedes registradas se encuentran activas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {inactiveCards.map(({ company, isCompanyInactive, sedes }) => (
                <div
                  key={company.id}
                  className="bg-slate-50 rounded-2xl border border-slate-300 overflow-hidden flex flex-col opacity-90"
                >
                  {/* Cabecera de la Tarjeta en Pestaña Inactivos */}
                  <div className="bg-slate-700 text-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-600 text-slate-200 flex items-center justify-center text-lg shrink-0">
                          🏛️
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
                              {company.businessName}
                            </h2>
                            <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                              NIT: {company.taxId}
                            </span>
                            {isCompanyInactive ? (
                              <span className="text-[10px] font-extrabold uppercase bg-red-500/30 text-red-200 border border-red-400/40 px-2 py-0.5 rounded-full">
                                🔒 Empresa Inactiva
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
                                Empresa Activa • {sedes.length} Sede(s) Inactiva(s)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {company.legalAddress || 'Sin dirección principal'}
                            {company.phone ? ` • Tel: ${company.phone}` : ''}
                          </p>
                        </div>
                      </div>

                      {canEdit && isCompanyInactive && (
                        <button
                          type="button"
                          onClick={() => handleReactivateCompany(company)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          🔄 Reactivar Parqueadero
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sedes Inactivas dentro de la tarjeta (Solo Lectura) */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Sedes Inactivas ({sedes.length}) — Bloqueadas para edición
                    </h3>

                    {sedes.map((parking) => (
                      <div
                        key={parking.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-slate-700">
                                📍 {parking.name}
                              </span>
                              <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                🔒 Sede Inactiva
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                ({parking.totalCapacity || 0} cupos)
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {parking.address}
                              {parking.phone ? ` • Tel: ${parking.phone}` : ''}
                            </p>
                          </div>

                          {canEdit && !isCompanyInactive && (
                            <button
                              type="button"
                              onClick={() => handleReactivateParking(parking)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors self-end sm:self-center shrink-0 cursor-pointer"
                            >
                              🔄 Reactivar Sede
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 opacity-75">
                          {(parking.capacitiesByType || []).map((c) => (
                            <div
                              key={c.vehicleTypeCode}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs text-slate-500"
                            >
                              <span>
                                {getVehicleIcon(c.vehicleTypeCode, c.vehicleTypeName)}{' '}
                                {c.vehicleTypeName}
                              </span>
                              <strong className="font-bold">{c.capacity}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Integrado para Crear / Asignar / Editar Sedes de un Administrador */}
      {adminModalOpen && adminModalState.company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {adminModalState.mode === 'EDIT_SEDES'
                  ? `Sedes de ${adminModalState.targetUser?.username}`
                  : 'Gestionar Administrador de Parqueadero / Sede'}
              </h3>
              <p className="text-xs font-semibold text-purple-700 mt-0.5">
                🏛️ {adminModalState.company.businessName} (NIT:{' '}
                {adminModalState.company.taxId})
              </p>
            </div>

            {adminModalState.mode !== 'EDIT_SEDES' && adminUsers.length > 0 && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setAdminModalState((prev) => ({ ...prev, mode: 'CREATE' }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adminModalState.mode === 'CREATE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Crear Nuevo Admin
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAdminModalState((prev) => ({
                      ...prev,
                      mode: 'ASSIGN_EXISTING',
                      existingAdminId:
                        prev.existingAdminId || String(adminUsers[0]?.id || ''),
                    }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adminModalState.mode === 'ASSIGN_EXISTING'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Asignar Admin Existente
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitAdminModal} className="space-y-4">
              {adminModalState.mode === 'CREATE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                      Usuario Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminModalState.username}
                      onChange={(e) =>
                        setAdminModalState((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="Ej: admin.sede"
                      className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                      Contraseña Temporal *
                    </label>
                    <input
                      type="password"
                      required
                      value={adminModalState.password}
                      onChange={(e) =>
                        setAdminModalState((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {adminModalState.mode === 'ASSIGN_EXISTING' && (
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Seleccione Administrador Existente *
                  </label>
                  <select
                    required
                    value={adminModalState.existingAdminId}
                    onChange={(e) =>
                      setAdminModalState((prev) => ({
                        ...prev,
                        existingAdminId: e.target.value,
                      }))
                    }
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">-- Seleccione un Administrador --</option>
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} (
                        {(u.managedParkings || [])
                          .map((mp) => mp.name)
                          .join(', ') || 'Sin sedes'}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selección de Sedes Activas de este Parqueadero */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    📍 Sedes activas que administrará en{' '}
                    {adminModalState.company.businessName}
                  </span>
                  {modalCompanyParkings.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectAllCompanySedesInModal(modalCompanyParkings)
                      }
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md cursor-pointer"
                    >
                      {modalCompanyParkings.every((p) =>
                        adminModalState.selectedParkingIds.includes(
                          Number(p.id),
                        ),
                      )
                        ? 'Desmarcar todas'
                        : 'Seleccionar todas las sedes'}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {modalCompanyParkings.map((p) => {
                    const checked = adminModalState.selectedParkingIds.includes(
                      Number(p.id),
                    );
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                          checked
                            ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div>📍 {p.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {p.address} • {p.totalCapacity || 0} cupos
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleAdminParkingId(p.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  disabled={adminModalState.saving}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adminModalState.saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  {adminModalState.saving
                    ? 'Guardando...'
                    : adminModalState.mode === 'CREATE'
                      ? 'Crear y Asignar Admin'
                      : 'Guardar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Integrado para Restablecer Contraseña de un Administrador */}
      {resetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              🔑 Restablecer Contraseña de Administrador
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Usuario:{' '}
              <strong className="text-slate-800">
                {resetTargetUser.username}
              </strong>
            </p>
            <form onSubmit={handleSubmitResetPassword} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                  Nueva Contraseña Temporal *
                </label>
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetSaving}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  {resetSaving ? 'Guardando...' : 'Restablecer Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Parqueadero (Razón Social) */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {companyForm.id
                ? 'Editar Parqueadero (Razón Social)'
                : 'Nuevo Parqueadero (Razón Social)'}
            </h3>
            <form onSubmit={handleSubmitCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Nombre del Parqueadero / Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.businessName}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        businessName: e.target.value,
                      })
                    }
                    placeholder="Ej: Inversiones Parking Central S.A.S."
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    NIT / Identificación Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.taxId}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, taxId: e.target.value })
                    }
                    placeholder="Ej: 900123456-7"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, phone: e.target.value })
                    }
                    placeholder="3001234567"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, email: e.target.value })
                    }
                    placeholder="contacto@parqueadero.com"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Dirección Principal
                  </label>
                  <input
                    type="text"
                    value={companyForm.legalAddress}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        legalAddress: e.target.value,
                      })
                    }
                    placeholder="Calle 100 # 15-20"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {!companyForm.id && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={companyForm.createInitialBranch}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          createInitialBranch: e.target.checked,
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Crear también la primera sede de este parqueadero ahora
                    </span>
                  </label>

                  {companyForm.createInitialBranch && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Nombre Primera Sede *
                          </label>
                          <input
                            type="text"
                            required={companyForm.createInitialBranch}
                            value={companyForm.initialBranchName}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                initialBranchName: e.target.value,
                              })
                            }
                            placeholder="Ej: Sede Principal"
                            className="border border-slate-300 rounded-lg w-full py-1.5 px-2.5 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Dirección de la Sede
                          </label>
                          <input
                            type="text"
                            value={companyForm.initialBranchAddress}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                initialBranchAddress: e.target.value,
                              })
                            }
                            placeholder="Igual a la principal si se deja vacío"
                            className="border border-slate-300 rounded-lg w-full py-1.5 px-2.5 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            🚗 Cupos Carro
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={companyForm.initialCarCapacity}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                initialCarCapacity: e.target.value,
                              })
                            }
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs font-bold"
                          />
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            🏍️ Cupos Moto
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={companyForm.initialMotorcycleCapacity}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                initialMotorcycleCapacity: e.target.value,
                              })
                            }
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs font-bold"
                          />
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            🚲 Cupos Bici
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={companyForm.initialBicycleCapacity}
                            onChange={(e) =>
                              setCompanyForm({
                                ...companyForm,
                                initialBicycleCapacity: e.target.value,
                              })
                            }
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs font-bold"
                          />
                        </div>
                      </div>

                      {canCreateUsers && (
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={companyForm.createInitialAdmin}
                              onChange={(e) =>
                                setCompanyForm({
                                  ...companyForm,
                                  createInitialAdmin: e.target.checked,
                                })
                              }
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-purple-900">
                              👤 Crear también el usuario Administrador (ADMIN) ahora
                            </span>
                          </label>

                          {companyForm.createInitialAdmin && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                  Usuario Admin *
                                </label>
                                <input
                                  type="text"
                                  required={companyForm.createInitialAdmin}
                                  value={companyForm.initialAdminUsername}
                                  onChange={(e) =>
                                    setCompanyForm({
                                      ...companyForm,
                                      initialAdminUsername: e.target.value,
                                    })
                                  }
                                  placeholder="Ej: admin.central"
                                  className="border border-slate-300 rounded-lg w-full py-1.5 px-2.5 text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                  Contraseña Temporal *
                                </label>
                                <input
                                  type="password"
                                  required={companyForm.createInitialAdmin}
                                  value={companyForm.initialAdminPassword}
                                  onChange={(e) =>
                                    setCompanyForm({
                                      ...companyForm,
                                      initialAdminPassword: e.target.value,
                                    })
                                  }
                                  placeholder="Mínimo 6 caracteres"
                                  className="border border-slate-300 rounded-lg w-full py-1.5 px-2.5 text-xs bg-white"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Guardar Parqueadero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar / Editar Sede Activa dentro de un Parqueadero Activo */}
      {parkingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {parkingForm.id ? 'Editar Sede y Cupos' : 'Agregar Nueva Sede'}
              </h3>
              {selectedCompanyForModal && (
                <p className="text-xs font-semibold text-blue-700 mt-0.5">
                  🏛️ Parqueadero: {selectedCompanyForModal.businessName} (NIT:{' '}
                  {selectedCompanyForModal.taxId})
                </p>
              )}
            </div>

            <form onSubmit={handleSubmitParking} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                  Parqueadero Activo (Razón Social / NIT) *
                </label>
                <select
                  required
                  value={parkingForm.companyId}
                  onChange={(e) =>
                    setParkingForm({ ...parkingForm, companyId: e.target.value })
                  }
                  className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Seleccione Parqueadero --</option>
                  {activeCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} (NIT: {c.taxId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Nombre de la Sede *
                  </label>
                  <input
                    type="text"
                    required
                    value={parkingForm.name}
                    onChange={(e) =>
                      setParkingForm({ ...parkingForm, name: e.target.value })
                    }
                    placeholder="Ej: Sede Norte"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Dirección Física *
                  </label>
                  <input
                    type="text"
                    required
                    value={parkingForm.address}
                    onChange={(e) =>
                      setParkingForm({ ...parkingForm, address: e.target.value })
                    }
                    placeholder="Carrera 15 # 120-45"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    🅿️ Campos / Cupos Independientes
                  </span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                    Total Sede: {computedTotalFormCapacity} cupos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🚗 Automóviles
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={parkingForm.carCapacity}
                      onChange={(e) =>
                        setParkingForm({
                          ...parkingForm,
                          carCapacity: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🏍️ Motocicletas
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={parkingForm.motorcycleCapacity}
                      onChange={(e) =>
                        setParkingForm({
                          ...parkingForm,
                          motorcycleCapacity: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🚲 Bicicletas
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={parkingForm.bicycleCapacity}
                      onChange={(e) =>
                        setParkingForm({
                          ...parkingForm,
                          bicycleCapacity: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md py-1.5 px-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Teléfono de la Sede
                  </label>
                  <input
                    type="text"
                    value={parkingForm.phone}
                    onChange={(e) =>
                      setParkingForm({ ...parkingForm, phone: e.target.value })
                    }
                    placeholder="3001234567"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={parkingForm.schedule}
                    onChange={(e) =>
                      setParkingForm({
                        ...parkingForm,
                        schedule: e.target.value,
                      })
                    }
                    placeholder="6:00 am - 10:00 pm"
                    className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase mb-1">
                  Nota en Tiquete Impreso
                </label>
                <textarea
                  value={parkingForm.notes}
                  onChange={(e) =>
                    setParkingForm({ ...parkingForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Conserve este tiquete..."
                  className="border border-slate-300 rounded-lg w-full py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setParkingModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-pointer"
                >
                  Guardar Sede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
