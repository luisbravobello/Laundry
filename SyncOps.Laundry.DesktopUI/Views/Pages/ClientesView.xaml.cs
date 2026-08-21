using System.Windows;
using System.Windows.Controls;
using SyncOps.Laundry.DesktopUI.ViewModels;

namespace SyncOps.Laundry.DesktopUI.Views.Pages;

public partial class ClientesView : UserControl
{
    public ClientesView()
    {
        InitializeComponent();
    }

    private async void UserControl_Loaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is ClientesViewModel vm)
        {
            await vm.CargarClientesAsync();
        }
    }
}
