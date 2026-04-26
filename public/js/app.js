/**
 * RDO - Relatório Diário de Obra
 * Main Application Logic
 */

// State management
let state = {
    obra: "",
    local: "",
    data: new Date().toISOString().split('T')[0],
    clima: "",
    equipe: [],
    obs: "",
    qualidade: {
        local: "",
        lixaEscova: 0,
        galvanizado: 0,
        torqueLacre: 0,
        twitter: ""
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    
    // Initialize Lucide icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

function setupEventListeners() {
    // Input sync for quality fields to display table
    const qualityFields = ['qualidade-local', 'lixa-escova', 'galvanizado', 'torque-lacre', 'twitter'];
    qualityFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const displayId = `display-${id.replace('qualidade-', '')}`;
                const displayEl = document.getElementById(displayId);
                if (displayEl) displayEl.textContent = el.value;
            });
        }
    });
}

// Load data from LocalStorage and then try from API
async function loadData() {
    const localData = localStorage.getItem('rdoData');
    if (localData) {
        state = JSON.parse(localData);
        populateForm(state);
    }

    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const serverData = await response.json();
            // Merge or use server data if local is empty
            if (!localData || Object.keys(serverData).length > 0) {
                state = { ...state, ...serverData };
                populateForm(state);
            }
        }
    } catch (error) {
        console.warn('Could not sync with server:', error);
    }
}

function populateForm(data) {
    document.getElementById('obra').value = data.obra || '';
    document.getElementById('local').value = data.local || '';
    document.getElementById('data').value = data.data || new Date().toISOString().split('T')[0];
    document.getElementById('clima').value = data.clima || '';
    document.getElementById('obs').value = data.obs || '';
    
    // Quality
    if (data.qualidade) {
        document.getElementById('qualidade-local').value = data.qualidade.local || '';
        document.getElementById('lixa-escova').value = data.qualidade.lixaEscova || 0;
        document.getElementById('galvanizado').value = data.qualidade.galvanizado || 0;
        document.getElementById('torque-lacre').value = data.qualidade.torqueLacre || 0;
        document.getElementById('twitter').value = data.qualidade.twitter || '';
        updateDisplay(data);
    }

    renderEquipeList(data.equipe || []);
}

async function saveData() {
    state = {
        obra: document.getElementById('obra').value,
        local: document.getElementById('local').value,
        data: document.getElementById('data').value,
        clima: document.getElementById('clima').value,
        equipe: getEquipeList(),
        obs: document.getElementById('obs').value,
        qualidade: {
            local: document.getElementById('qualidade-local').value,
            lixaEscova: parseInt(document.getElementById('lixa-escova').value) || 0,
            galvanizado: parseInt(document.getElementById('galvanizado').value) || 0,
            torqueLacre: parseInt(document.getElementById('torque-lacre').value) || 0,
            twitter: document.getElementById('twitter').value
        }
    };

    // Save to localStorage
    localStorage.setItem('rdoData', JSON.stringify(state));
    
    // Save to Server
    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        
        if (response.ok) {
            showNotification('Dados salvos com sucesso no servidor!');
        } else {
            showNotification('Dados salvos localmente (erro no servidor).', 'warning');
        }
    } catch (error) {
        showNotification('Dados salvos localmente.', 'info');
    }

    updateDisplay(state);
}

function updateDisplay(data) {
    document.getElementById('display-local').textContent = data.qualidade.local || '-';
    document.getElementById('display-lixa-escova').textContent = data.qualidade.lixaEscova || '0';
    document.getElementById('display-galvanizado').textContent = data.qualidade.galvanizado || '0';
    document.getElementById('display-torque-lacre').textContent = data.qualidade.torqueLacre || '0';
    document.getElementById('display-twitter').textContent = data.qualidade.twitter || '-';
}

function renderEquipeList(equipe) {
    const list = document.getElementById('equipe-list');
    list.innerHTML = '';
    equipe.forEach((member, index) => {
        addEquipeRow(member, index);
    });
}

function addEquipeMember() {
    addEquipeRow('', document.querySelectorAll('.equipe-item').length);
}

function addEquipeRow(value = '', index) {
    const list = document.getElementById('equipe-list');
    const div = document.createElement('div');
    div.className = 'equipe-item';
    div.innerHTML = `
        <input type="text" value="${value}" placeholder="Nome do membro" class="equipe-input">
        <button type="button" class="btn-danger" onclick="this.parentElement.remove()" title="Remover">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
    `;
    list.appendChild(div);
    if (window.lucide) window.lucide.createIcons();
}

function getEquipeList() {
    const inputs = document.querySelectorAll('.equipe-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
}

async function getGPSLocation() {
    if (!navigator.geolocation) {
        showNotification('Geolocalização não suportada.', 'error');
        return;
    }

    const btn = document.querySelector('[onclick="getGPSLocation()"]');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>Obtendo...</span>';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            const data = await response.json();
            document.getElementById('local').value = data.display_name || `${latitude}, ${longitude}`;
            showNotification('Localização obtida!');
        } catch (error) {
            document.getElementById('local').value = `${latitude}, ${longitude}`;
            showNotification('Coordenadas obtidas.', 'info');
        } finally {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }, (error) => {
        showNotification('Erro ao obter localização.', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    });
}

function generateTXT() {
    const content = formatReportText();
    const blob = new Blob([content], { type: 'text/plain' });
    downloadFile(blob, `RDO_${state.data}_${state.obra.replace(/\s+/g, '_')}.txt`);
}

function formatReportText() {
    return `RDO – RELATÓRIO DIÁRIO DE OBRA\n
-----------------------------------
📍 Obra: ${state.obra}
📍 Local: ${state.local}
📅 Data: ${formatDate(state.data)}
🌤️ Clima: ${state.clima}
👥 Equipe: ${getEquipeList().join(', ') || 'Não informada'}
📝 Observações: ${state.obs || 'Nenhuma'}

🖌️ QUALIDADE
LOCAL: ${state.qualidade.local}
LIXA / ESCOVA: ${state.qualidade.lixaEscova}
GALVANIZADO: ${state.qualidade.galvanizado}
TORQUE E LACRE: ${state.qualidade.torqueLacre}
Twitter: ${state.qualidade.twitter || '-'}
-----------------------------------
Gerado em: ${new Date().toLocaleString('pt-BR')}`;
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function sendToWhatsApp() {
    const text = formatReportText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}

function clearForm() {
    if (confirm('Tem certeza que deseja limpar todo o formulário?')) {
        document.querySelectorAll('input, textarea').forEach(el => el.value = '');
        document.getElementById('equipe-list').innerHTML = '';
        state = { equipe: [], qualidade: {} };
        updateDisplay(state);
        localStorage.removeItem('rdoData');
        showNotification('Formulário limpo.');
    }
}

function printReport() {
    window.print();
}

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s, transform 0.3s;
        background-color: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// PDF Export Function (requires jspdf)
async function exportPDF() {
    if (!window.jspdf) {
        showNotification('Biblioteca PDF não carregada.', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório Diário de Obra (RDO)', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Obra: ${state.obra}`, 20, 40);
    doc.text(`Local: ${state.local}`, 20, 50);
    doc.text(`Data: ${formatDate(state.data)}`, 20, 60);
    doc.text(`Clima: ${state.clima}`, 20, 70);
    
    doc.text('Equipe:', 20, 90);
    const equipe = getEquipeList();
    equipe.forEach((m, i) => doc.text(`- ${m}`, 25, 100 + (i * 10)));
    
    let y = 100 + (equipe.length * 10) + 10;
    doc.text('Qualidade:', 20, y);
    doc.text(`Local: ${state.qualidade.local}`, 25, y + 10);
    doc.text(`Lixa/Escova: ${state.qualidade.lixaEscova}`, 25, y + 20);
    doc.text(`Galvanizado: ${state.qualidade.galvanizado}`, 25, y + 30);
    doc.text(`Torque e Lacre: ${state.qualidade.torqueLacre}`, 25, y + 40);
    
    doc.save(`RDO_${state.data}.pdf`);
}
